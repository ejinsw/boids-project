import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const canvas = document.querySelector('canvas.webgl')

const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(80, 80, 160)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const terrariumDimensions = {
    width: 100,
    height: 100,
    depth: 100
}

const terrarium = new THREE.Group()

const ground = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, 1, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: 'lightgreen' })
)
ground.position.set(terrariumDimensions.width / 2, -0.5, terrariumDimensions.depth / 2)
ground.receiveShadow = true
terrarium.add(ground)

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

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(50, 100, 50)
directionalLight.castShadow = true
scene.add(directionalLight)

const BOID_CONST = {
    boidNum: 100,
    sepRadius: 5,
    perceptionRadius: 15,
    maxSpeed: 1.0,
    maxSteering: 0.03,
    weightSeperation: 1.5,
    weightAlighment: 1.0,
    weightCohesion: 1.0,
    margin: 10
}

const CUBE_LEN = 10
const CELL_SIZE = Math.max(
    terrariumDimensions.width, 
    terrariumDimensions.height, 
    terrariumDimensions.depth
) / CUBE_LEN

const BOID_CUBES = Array(CUBE_LEN).fill().map(() =>
    Array(CUBE_LEN).fill().map(() =>
        Array(CUBE_LEN).fill().map(() => [])
    )
)

const BoidGeometry = new THREE.ConeGeometry(0.5, 2, 8)
BoidGeometry.rotateX(Math.PI / 2)
const BoidMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    metalness: 0.3,
    roughness: 0.4
})

class Boid {
    constructor() {
        this.mesh = new THREE.Mesh(BoidGeometry, BoidMaterial)
        this.mesh.position.set(
            Math.random() * terrariumDimensions.width,
            Math.random() * terrariumDimensions.height,
            Math.random() * terrariumDimensions.depth
        )
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        )
        this.velocity.normalize().multiplyScalar(BOID_CONST.maxSpeed * Math.random())
        this.acceleration = new THREE.Vector3()
        this.cubeX = -1
        this.cubeY = -1
        this.cubeZ = -1
        this.close = []
        scene.add(this.mesh)
    }

    move() {
        this.getCloseBoids()

        const acceleration = new THREE.Vector3()
        acceleration.add(this.border())
        acceleration.add(this.seperation())
        acceleration.add(this.alignment())
        acceleration.add(this.cohesion())

        this.velocity.add(acceleration)
        this.velocity.clampLength(0, BOID_CONST.maxSpeed)
        this.mesh.position.add(this.velocity)
        this.acceleration.set(0, 0, 0)

        const face = new THREE.Vector3().copy(this.mesh.position).add(this.velocity)
        this.mesh.lookAt(face)
    }

    getCloseBoids() {
        this.close = []
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const nx = this.cubeX + dx
                    const ny = this.cubeY + dy
                    const nz = this.cubeZ + dz

                    if (nx < 0 || nx >= CUBE_LEN || ny < 0 || ny >= CUBE_LEN || nz < 0 || nz >= CUBE_LEN) continue

                    const cell = BOID_CUBES[nx][ny][nz]
                    for (const boid of cell) {
                        if (boid === this) continue
                        const distance = this.mesh.position.distanceTo(boid.mesh.position)
                        if (distance < BOID_CONST.perceptionRadius) {
                            this.close.push(boid)
                        }
                    }
                }
            }
        }
    }

    border() {
        const steeringVector = new THREE.Vector3()
        if (this.mesh.position.x < BOID_CONST.margin) {
            steeringVector.x = BOID_CONST.maxSpeed
        } else if (this.mesh.position.x > terrariumDimensions.width - BOID_CONST.margin) {
            steeringVector.x = -BOID_CONST.maxSpeed
        }
        if (this.mesh.position.y < BOID_CONST.margin) {
            steeringVector.y = BOID_CONST.maxSpeed
        } else if (this.mesh.position.y > terrariumDimensions.height - BOID_CONST.margin) {
            steeringVector.y = -BOID_CONST.maxSpeed
        }
        if (this.mesh.position.z < BOID_CONST.margin) {
            steeringVector.z = BOID_CONST.maxSpeed
        } else if (this.mesh.position.z > terrariumDimensions.depth - BOID_CONST.margin) {
            steeringVector.z = -BOID_CONST.maxSpeed
        }
        return steeringVector
    }

    seperation() {
        const seperationVector = new THREE.Vector3()
        let count = 0

        for (const boid of this.close) {
            const distance = this.mesh.position.distanceTo(boid.mesh.position)
            if (distance < BOID_CONST.sepRadius) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, boid.mesh.position)
                diff.normalize()
                diff.divideScalar(Math.max(distance, 0.1))
                seperationVector.add(diff)
                count++
            }
        }

        if (count > 0) {
            seperationVector.divideScalar(count)
            seperationVector.normalize()
            seperationVector.multiplyScalar(BOID_CONST.maxSpeed)
            seperationVector.sub(this.velocity)
            seperationVector.clampLength(0, BOID_CONST.maxSteering)
        }

        return seperationVector.multiplyScalar(BOID_CONST.weightSeperation)
    }

    alignment() {
        const alignmentVector = new THREE.Vector3()
        let count = 0

        for (const boid of this.close) {
            alignmentVector.add(boid.velocity)
            count++
        }

        if (count > 0) {
            alignmentVector.divideScalar(count)
            alignmentVector.normalize()
            alignmentVector.multiplyScalar(BOID_CONST.maxSpeed)
            alignmentVector.sub(this.velocity)
            alignmentVector.clampLength(0, BOID_CONST.maxSteering)
        }

        return alignmentVector.multiplyScalar(BOID_CONST.weightAlighment)
    }

    cohesion() {
        const cohesionVector = new THREE.Vector3()
        let count = 0

        for (const boid of this.close) {
            cohesionVector.add(boid.mesh.position)
            count++
        }

        if (count > 0) {
            cohesionVector.divideScalar(count)
            const desired = new THREE.Vector3().subVectors(cohesionVector, this.mesh.position)
            desired.normalize()
            desired.multiplyScalar(BOID_CONST.maxSpeed)
            const steering = new THREE.Vector3().subVectors(desired, this.velocity)
            steering.clampLength(0, BOID_CONST.maxSteering)
            return steering.multiplyScalar(BOID_CONST.weightCohesion)
        }

        return cohesionVector
    }
}

const boids = []
for (let i = 0; i < BOID_CONST.boidNum; i++) {
    boids.push(new Boid())
}

function updateBoidCubes() {
    for (let x = 0; x < CUBE_LEN; x++) {
        for (let y = 0; y < CUBE_LEN; y++) {
            for (let z = 0; z < CUBE_LEN; z++) {
                BOID_CUBES[x][y][z] = []
            }
        }
    }

    for (const boid of boids) {
        const x = Math.floor(boid.mesh.position.x / CELL_SIZE)
        const y = Math.floor(boid.mesh.position.y / CELL_SIZE)
        const z = Math.floor(boid.mesh.position.z / CELL_SIZE)
        boid.cubeX = x
        boid.cubeY = y
        boid.cubeZ = z
        BOID_CUBES[x][y][z].push(boid)
    }
}

const clock = new THREE.Clock()

function tick() {
    const deltaTime = clock.getDelta()
    controls.update()
    updateBoidCubes()

    for (const boid of boids) {
        boid.move()
    }

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()