import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Basic setup
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const terrariumDimensions = {
    width: 100,
    height: 100,
    depth: 100
}

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(80, 80, 160)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.target.set(
    terrariumDimensions.width / 2,
    terrariumDimensions.height / 2 - 10,
    terrariumDimensions.depth / 2
)
controls.update()

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Handle window resize
window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Terrarium setup
 */


const terrarium = new THREE.Group()

// Ground
const ground = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, 1, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: 'lightgreen' })
)
ground.position.set(terrariumDimensions.width / 2, -0.5, terrariumDimensions.depth / 2)
ground.receiveShadow = true
terrarium.add(ground)

// Container
const container = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({
        color: '#c7f5fb',
        transparent: true,
        opacity: 0.2,
        shininess: 100,
        side: THREE.DoubleSide
    })
)
container.position.set(terrariumDimensions.width / 2, terrariumDimensions.height / 2, terrariumDimensions.depth / 2)
terrarium.add(container)

scene.add(terrarium)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(50, 100, 50)
directionalLight.castShadow = true
scene.add(directionalLight)

/**
 * Boids Implementation
 */
// Constants
const BOID_CONFIG = {
    count: 100,
    radius: 5,
    perceptionRadius: 15,
    maxSpeed: 1.0,
    maxForce: 0.03,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    separationWeight: 1.5,
    edgeMargin: 10
}

// Spatial partitioning grid dimensions
const GRID_SIZE = 10
const CELL_SIZE = Math.max(
    terrariumDimensions.width,
    terrariumDimensions.height,
    terrariumDimensions.depth
) / GRID_SIZE

// Create the spatial grid
const spatialGrid = Array(GRID_SIZE).fill().map(() =>
    Array(GRID_SIZE).fill().map(() =>
        Array(GRID_SIZE).fill().map(() => [])
    )
)

// Boid geometry and material
const boidGeometry = new THREE.ConeGeometry(0.5, 2, 8)
boidGeometry.rotateX(Math.PI / 2)
const boidMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    metalness: 0.3,
    roughness: 0.4
})

class Boid {
    constructor() {
        // Create the mesh
        this.mesh = new THREE.Mesh(boidGeometry, boidMaterial)

        // Set initial position
        this.mesh.position.set(
            Math.random() * terrariumDimensions.width,
            Math.random() * terrariumDimensions.height,
            Math.random() * terrariumDimensions.depth
        )

        // Initial velocity (random direction)
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        )
        this.velocity.normalize().multiplyScalar(BOID_CONFIG.maxSpeed * Math.random())

        // Initial acceleration
        this.acceleration = new THREE.Vector3()

        // Grid cell position
        this.gridCell = { x: 0, y: 0, z: 0 }

        // Add to scene
        scene.add(this.mesh)
    }

    // Apply a force to the boid's acceleration
    applyForce(force) {
        this.acceleration.add(force)
    }

    // Update position and velocity
    update() {
        // Update velocity
        this.velocity.add(this.acceleration)

        // Limit speed
        if (this.velocity.length() > BOID_CONFIG.maxSpeed) {
            this.velocity.normalize().multiplyScalar(BOID_CONFIG.maxSpeed)
        }

        // Update position
        this.mesh.position.add(this.velocity)

        // Reset acceleration
        this.acceleration.set(0, 0, 0)

        // Update orientation to match velocity direction
        if (this.velocity.length() > 0.1) {
            const lookAtPosition = new THREE.Vector3().copy(this.mesh.position).add(this.velocity)
            this.mesh.lookAt(lookAtPosition)
        }

        // Update grid cell
        this.updateGridCell()
    }

    // Calculate which cell this boid belongs to
    updateGridCell() {
        const x = Math.floor(this.mesh.position.x / CELL_SIZE)
        const y = Math.floor(this.mesh.position.y / CELL_SIZE)
        const z = Math.floor(this.mesh.position.z / CELL_SIZE)

        this.gridCell = {
            x: THREE.MathUtils.clamp(x, 0, GRID_SIZE - 1),
            y: THREE.MathUtils.clamp(y, 0, GRID_SIZE - 1),
            z: THREE.MathUtils.clamp(z, 0, GRID_SIZE - 1)
        }
    }

    // Get nearby boids from spatial grid
    getNearbyBoids() {
        const nearby = []

        // Check the current cell and neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const nx = this.gridCell.x + dx
                    const ny = this.gridCell.y + dy
                    const nz = this.gridCell.z + dz

                    // Skip cells outside the grid
                    if (nx < 0 || nx >= GRID_SIZE ||
                        ny < 0 || ny >= GRID_SIZE ||
                        nz < 0 || nz >= GRID_SIZE) {
                        continue
                    }

                    // Add boids from this cell
                    const cell = spatialGrid[nx][ny][nz]
                    for (const boid of cell) {
                        // Skip self
                        if (boid === this) continue

                        // Check if within perception radius
                        const distance = this.mesh.position.distanceTo(boid.mesh.position)
                        if (distance < BOID_CONFIG.perceptionRadius) {
                            nearby.push(boid)
                        }
                    }
                }
            }
        }

        return nearby
    }

    // Separation: steer to avoid crowding local flockmates
    separate() {
        const steering = new THREE.Vector3()
        let count = 0

        const nearbyBoids = this.getNearbyBoids()

        for (const other of nearbyBoids) {
            const distance = this.mesh.position.distanceTo(other.mesh.position)

            if (distance < BOID_CONFIG.radius) {
                // Calculate vector pointing away from neighbor
                const diff = new THREE.Vector3().subVectors(this.mesh.position, other.mesh.position)
                diff.normalize()
                diff.divideScalar(Math.max(distance, 0.1)) // Weight by distance
                steering.add(diff)
                count++
            }
        }

        if (count > 0) {
            steering.divideScalar(count)

            // Implement Reynolds: Steering = Desired - Velocity
            steering.normalize()
            steering.multiplyScalar(BOID_CONFIG.maxSpeed)
            steering.sub(this.velocity)

            // Limit force
            if (steering.length() > BOID_CONFIG.maxForce) {
                steering.normalize().multiplyScalar(BOID_CONFIG.maxForce)
            }
        }

        return steering
    }

    // Alignment: steer towards the average heading of local flockmates
    align() {
        const steering = new THREE.Vector3()
        let count = 0

        const nearbyBoids = this.getNearbyBoids()

        for (const other of nearbyBoids) {
            steering.add(other.velocity)
            count++
        }

        if (count > 0) {
            steering.divideScalar(count)

            // Implement Reynolds: Steering = Desired - Velocity
            steering.normalize()
            steering.multiplyScalar(BOID_CONFIG.maxSpeed)
            steering.sub(this.velocity)

            // Limit force
            if (steering.length() > BOID_CONFIG.maxForce) {
                steering.normalize().multiplyScalar(BOID_CONFIG.maxForce)
            }
        }

        return steering
    }

    // Cohesion: steer to move toward the average position of local flockmates
    cohere() {
        const steering = new THREE.Vector3()
        let count = 0

        const nearbyBoids = this.getNearbyBoids()

        for (const other of nearbyBoids) {
            steering.add(other.mesh.position)
            count++
        }

        if (count > 0) {
            steering.divideScalar(count)

            // Seek target position
            return this.seek(steering)
        }

        return steering
    }

    // Seek a target position
    seek(target) {
        // Desired velocity
        const desired = new THREE.Vector3().subVectors(target, this.mesh.position)

        // Scale to maximum speed
        desired.normalize()
        desired.multiplyScalar(BOID_CONFIG.maxSpeed)

        // Steering = Desired - Velocity
        const steering = new THREE.Vector3().subVectors(desired, this.velocity)

        // Limit force
        if (steering.length() > BOID_CONFIG.maxForce) {
            steering.normalize().multiplyScalar(BOID_CONFIG.maxForce)
        }

        return steering
    }

    // Contain boids within the terrarium
    containment() {
        const steering = new THREE.Vector3()
        const margin = BOID_CONFIG.edgeMargin
        const desiredSpeed = BOID_CONFIG.maxSpeed

        // Check x boundaries
        if (this.mesh.position.x < margin) {
            steering.x = desiredSpeed
        } else if (this.mesh.position.x > terrariumDimensions.width - margin) {
            steering.x = -desiredSpeed
        }

        // Check y boundaries
        if (this.mesh.position.y < margin) {
            steering.y = desiredSpeed
        } else if (this.mesh.position.y > terrariumDimensions.height - margin) {
            steering.y = -desiredSpeed
        }

        // Check z boundaries
        if (this.mesh.position.z < margin) {
            steering.z = desiredSpeed
        } else if (this.mesh.position.z > terrariumDimensions.depth - margin) {
            steering.z = -desiredSpeed
        }

        return steering
    }

    // Flock: calculate all flocking forces and apply them
    flock() {
        const separation = this.separate().multiplyScalar(BOID_CONFIG.separationWeight)
        const alignment = this.align().multiplyScalar(BOID_CONFIG.alignmentWeight)
        const cohesion = this.cohere().multiplyScalar(BOID_CONFIG.cohesionWeight)
        const containment = this.containment()

        this.applyForce(separation)
        this.applyForce(alignment)
        this.applyForce(cohesion)
        this.applyForce(containment)
    }
}

// Create boids
const boids = []
const heroBoid = new Boid()
heroBoid.mesh.material = new THREE.MeshStandardMaterial({ color: 'red' })
boids.push(heroBoid)
for (let i = 0; i < BOID_CONFIG.count; i++) {
    boids.push(new Boid())
}

// Update spatial grid
function updateSpatialGrid() {
    // Clear grid
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                spatialGrid[x][y][z] = []
            }
        }
    }


    // Add boids to grid
    for (const boid of boids) {
        const { x, y, z } = boid.gridCell
        spatialGrid[x][y][z].push(boid)
    }
}

/**
 * Event Listeners
 */
let isCameraFollowing = false
window.addEventListener('keypress', (e) => {
    if (e.key === 'c') {
        isCameraFollowing = !isCameraFollowing
        if (isCameraFollowing) {
            camera.position.copy(heroBoid.mesh.position).add(new THREE.Vector3(0, 3, -3))
            controls.enabled = false
        } else {
            camera.position.set(80, 80, 160)
            controls.enabled = true
        }
    }
})

/**
 * Animation
 */
const clock = new THREE.Clock()

function tick() {
    const deltaTime = clock.getDelta()

    // Update controls
    controls.update()

    // Update spatial grid
    updateSpatialGrid()

    // Update boids
    for (const boid of boids) {
        boid.flock()
        boid.update()
    }

    // Update camera boid
    if (isCameraFollowing) {
        const offset = new THREE.Vector3(0, 3, -6);
        offset.applyQuaternion(heroBoid.mesh.quaternion);
        const desiredPosition = new THREE.Vector3().copy(heroBoid.mesh.position).add(offset);

        camera.position.lerp(desiredPosition, 0.05);

        const lookAtTarget = new THREE.Vector3(0, 0, 3);
        lookAtTarget.applyQuaternion(heroBoid.mesh.quaternion);
        lookAtTarget.add(heroBoid.mesh.position);
        camera.lookAt(lookAtTarget);
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()