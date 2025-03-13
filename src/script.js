import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { ThreeMFLoader } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


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

// Trying to load a 3d Model

// COMENT THIS OUT IF YOU DONT WANT IT
const loader = new GLTFLoader();

loader.load('./wooden-bridge/source/WoodenBridge.gltf', function (gltf)
{
    const model = gltf.scene;
    const boundingBox = new THREE.Box3().setFromObject(model);
    let scale = 12;
    model.scale.set(scale, scale, scale);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    let bridgeY = boundingBox.min.y;
    model.position.set(0, 0, 0);
    const offsetVector = center.clone().multiplyScalar(scale);
    model.position.set(terrariumDimensions.width / 2, bridgeY ,terrariumDimensions.depth / 2);
    model.position.sub(offsetVector);
    scene.add(model);
});


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
    edgeMargin: 10,
    runSimulation: false,
    sepBadBoid: 1.0,
    addBadBoid: false
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

const badBoidGeometry = new THREE.ConeGeometry(1, 4, 8)
badBoidGeometry.rotateX(Math.PI / 2)
const badBoidMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.3,
    roughness: 0.4
})

let badBoid = null;

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

    badBoid() {
        if (badBoid != null) {
            try {
                const desired = new THREE.Vector3().subVectors(this.mesh.position, badBoid.mesh.position);
                let distance = desired.length();
                const badForce = BOID_CONFIG.maxForce * 1;
                if (distance < 0.001) {
                    desired.sub(this.velocity);
                    desired.normalize();
                    return desired.multiplyScalar(badForce);
                }

                desired.multiplyScalar(BOID_CONFIG.maxSpeed * (distance / (BOID_CONFIG.radius)));
                const steering = new THREE.Vector3().subVectors(desired, this.velocity);

                if (steering.length() > badForce) {
                    steering.normalize().multiplyScalar(badForce);
                }

                return steering.multiplyScalar(BOID_CONFIG.sepBadBoid);
            }
            catch (error) {
                console.error("Error in badBoid function in boid", error);
                return new THREE.Vector3();
            }
            // const desired = new THREE.Vector3().subVectors(this.mesh.position,badBoid.mesh.position);
            // let distance = desired.length;
            // distance -= BOID_CONFIG.radius;
            // distance = Math.max(0.1,distance);
            // desired.normalize();
            // desired.multiplyScalar(BOID_CONFIG.maxSpeed);
            // const steering = new THREE.Vector3().subVectors(desired,this.velocity);
            // steering.divideScalar(distance);
            // return steering.multiplyScalar(BOID_CONFIG.sepBadBoid);
        }
        else {
            return new THREE.Vector3();
        }
    }

    // Flock: calculate all flocking forces and apply them
    flock() {
        const separation = this.separate().multiplyScalar(BOID_CONFIG.separationWeight)
        const alignment = this.align().multiplyScalar(BOID_CONFIG.alignmentWeight)
        const cohesion = this.cohere().multiplyScalar(BOID_CONFIG.cohesionWeight)
        const containment = this.containment()
        const badBoid = this.badBoid();

        this.applyForce(separation)
        this.applyForce(alignment)
        this.applyForce(cohesion)
        this.applyForce(containment)
        this.applyForce(badBoid)
    }
}


// in hindsight should have made this its own class
class BadBoid extends Boid {
    constructor() {
        super();

        scene.remove(this.mesh);
        this.mesh = new THREE.Mesh(badBoidGeometry, badBoidMaterial);
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
    separate() {
        return new THREE.Vector3();
    }
    align() {
        return new THREE.Vector3();
    }
    cohere() {
        const desired = new THREE.Vector3();
        let closestDistance = 100;

        for (const boid of boids) {
            const distance = this.mesh.position.distanceTo(boid.mesh.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                desired.copy(boid.mesh.position);
            }
        }
        return this.seek(desired).multiplyScalar(BOID_CONFIG.cohesionWeight);
    }
    flock() {
        const cohesion = this.cohere()
        const containment = this.containment()

        this.applyForce(cohesion)
        this.applyForce(containment)

        console.log("Cohesion force:", cohesion); // Debug log
        console.log("Containment force:", containment);
    }
    update() {
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

        this.updateGridCell();
    }

    // Calculate which cell this boid belongs to
    updateGridCell() {
        const x = Math.floor(this.mesh.position.x / CELL_SIZE)
        const y = Math.floor(this.mesh.position.y / CELL_SIZE)
        const z = Math.floor(this.mesh.position.z / CELL_SIZE)

        this.gridCell =
        {
            x: THREE.MathUtils.clamp(x, 0, GRID_SIZE - 1),
            y: THREE.MathUtils.clamp(y, 0, GRID_SIZE - 1),
            z: THREE.MathUtils.clamp(z, 0, GRID_SIZE - 1)
        }
    }
}


function createBadBoid() {
    badBoid = new BadBoid();
}
function removeBadBoid() {
    scene.remove(badBoid.mesh);
    badBoid.mesh.geometry.dispose();
    badBoid.mesh.material.dispose();
    badBoid = null;
    console.log("Bad boid removed");
}

// Create boids
const boids = []
let heroBoid = null

function createBoids() {
    heroBoid = new Boid()
    heroBoid.mesh.material = new THREE.MeshStandardMaterial({ color: 'green' })
    boids.push(heroBoid)
    for (let i = 0; i < BOID_CONFIG.count; i++) {
        boids.push(new Boid())
    }
}
function removeBoids() {
    for (let boid of boids) {
        scene.remove(boid.mesh);
        boid.mesh.geometry.dispose();
        boid.mesh.material.dispose();
    }
    boids.length = 0;
}

// Update spatial grid
function updateSpatialGrid() {
    // Clear grid
    console.log(boids.length);

    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                spatialGrid[x][y][z] = []
            }
        }
    }


    // Add boids to grid
    for (let i = 0; i < boids.length; i++) {
        const boid = boids[i];

        // Check for NaN positions and fix them
        if (isNaN(boid.mesh.position.x) || isNaN(boid.mesh.position.y) || isNaN(boid.mesh.position.z)) {
            console.warn(`Found NaN position in boid ${i}, resetting position`);
            // Reset to a valid position
            boid.mesh.position.set(
                Math.random() * terrariumDimensions.width,
                Math.random() * terrariumDimensions.height,
                Math.random() * terrariumDimensions.depth
            );
            // Force update grid cell
            boid.updateGridCell();
        }

        // Now add to grid with additional safety
        if (boid.gridCell &&
            !isNaN(boid.gridCell.x) &&
            !isNaN(boid.gridCell.y) &&
            !isNaN(boid.gridCell.z)) {

            const x = boid.gridCell.x;
            const y = boid.gridCell.y;
            const z = boid.gridCell.z;

            // Final check before adding to grid
            if (x >= 0 && x < GRID_SIZE &&
                y >= 0 && y < GRID_SIZE &&
                z >= 0 && z < GRID_SIZE) {
                spatialGrid[x][y][z].push(boid);
            }
        }
    }
    // for (const boid of boids) {
    //     console.log(boid.mesh.position);
    //     const { x, y, z } = boid.gridCell;
    //     spatialGrid[x][y][z].push(boid)
    // }
}

/**
 * Event Listeners
 */
let cameraBoid = null
window.addEventListener('keypress', (e) => {
    if (e.key === 'c') {
        switch (cameraBoid) {
            case null:
                if (!heroBoid) {
                    cameraBoid = badBoid
                    break
                }
                cameraBoid = heroBoid
                break
            case heroBoid:
                cameraBoid = badBoid
                break
            case badBoid:
                cameraBoid = null
                break
        }
        if (!cameraBoid) {
            camera.position.set(80, 80, 160)
            controls.enabled = true
        } else {
            camera.position.copy(cameraBoid.mesh.position).add(new THREE.Vector3(0, 3, -3))
            controls.enabled = false
        }
    }
})


const gui = new GUI();

const boidCount = gui.add(BOID_CONFIG, 'count', 1, 1000, 1);
boidCount.onChange(() => {
    console.log(BOID_CONFIG.count);
});
boidCount.show();

gui.add(BOID_CONFIG, 'runSimulation').onChange((value) => {
    if (value) {
        createBoids();
        boidCount.hide();
    }
    else {
        console.log("Boids removed");
        removeBoids();
        boidCount.show();
    }
    console.log('Changed Status');
});


gui.add(BOID_CONFIG, 'alignmentWeight', 0.1, 3.0, 0.1).onChange(() => {
    console.log(BOID_CONFIG.alignmentWeight);
});
gui.add(BOID_CONFIG, 'cohesionWeight', 0.1, 3.0, 0.1).onChange(() => {
    console.log(BOID_CONFIG.cohesionWeight);
});
gui.add(BOID_CONFIG, 'separationWeight', 0.1, 3.0, 0.1).onChange(() => {
    console.log(BOID_CONFIG.separationWeight);
});
gui.add(BOID_CONFIG, 'addBadBoid').onChange((value) => {
    if (value) {
        console.log("Bad boid created");
        createBadBoid();
    }
    else {
        console.log("Bad boid removed");
        removeBadBoid();
    }
});


// gui.add(BOID_CONFIG.cohesionWeight,'Cohesion',0.1,3.0,0.1);
// gui.add(BOID_CONFIG.separationWeight,'Separation',0.1,3.0,0.1);



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

    // Camera
    if (!!cameraBoid) {
        const offset = new THREE.Vector3(0, 3, -6);
        offset.applyQuaternion(cameraBoid.mesh.quaternion);
        const desiredPosition = new THREE.Vector3().copy(cameraBoid.mesh.position).add(offset);

        camera.position.lerp(desiredPosition, 0.05);

        const lookAtTarget = new THREE.Vector3(0, 0, 3);
        lookAtTarget.applyQuaternion(cameraBoid.mesh.quaternion);
        lookAtTarget.add(cameraBoid.mesh.position);
        camera.lookAt(lookAtTarget);
    }

    // Update boids
    if (BOID_CONFIG.runSimulation) {
        if (badBoid) {
            badBoid.flock();
            badBoid.update();
        }
        for (const boid of boids) {
            boid.flock()
            boid.update()
        }
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()