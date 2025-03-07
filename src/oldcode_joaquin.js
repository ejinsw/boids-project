import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { OctreeHelper, ThreeMFLoader, TransformControls } from 'three/examples/jsm/Addons.js'

// FROM HERE


//Making safe point
/**
 * Base
 */
// Debug
const gui = new GUI()
const debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')

// Raycaster
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
var boids = [];


/**
 * Terrarium
 */
// const terrariumDimensions = {
//     width: 15,
//     height: 10,
//     depth: 15
// }
const terrariumDimensions = {
    width: 100,
    height: 100,
    depth: 100
}

const BoidGeometry = new THREE.ConeGeometry(0.2,0.7,32);
BoidGeometry.rotateX(Math.PI / 2);
const BoidMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});

/*
 *
 * Boid Constants
 * 
 */
const BOID_CONST = {
    boidNum: 100,
    sepRadius: 5, // 
    maxSpeed: 1.0,
    maxSteering: 0.02,
    weightSeperation: 1.5,
    weightAlighment: 1.0,
    weightCohesion:  1.0,
    margin: 10
}

const Z_AXIS = new THREE.Vector3(0,0,1);

const CUBE_LEN = 10;
const BOID_CUBES = Array(CUBE_LEN).fill().map(() =>
                   Array(CUBE_LEN).fill().map(() =>
                   Array(CUBE_LEN).fill().map(() => [])));

let nonEmptyCubes = new Set();

class Boid {
    constructor()  {
        this.mesh = new THREE.Mesh(BoidGeometry, BoidMaterial);
        this.mesh.geometry.rotateZ(Math.PI / 2);
        this.mesh.visible = true;
        this.mesh.position.set(
            Math.random() * terrariumDimensions.width,
            Math.random() * terrariumDimensions.height,
            Math.random() * terrariumDimensions.depth
        );

        // Velocity should be un Rotated and then rotate before applying to position
        this.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() -0.5, Math.random() -0.5).normalize();
        this.acceleration = new THREE.Vector3();

        const face = new THREE.Vector3().copy(this.velocity).add(this.mesh.position);
        this.mesh.lookAt(face);

        this.xMin = 0;
        this.xMax = terrariumDimensions.width;
        this.yMin = 0;
        this.yMax = terrariumDimensions.height;
        this.zMin = 0;
        this.zMax = terrariumDimensions.depth;

        this.cubeX = -1;
        this.cubeY = -1;
        this.cubeZ = -1;

        this.close = [];

        scene.add(this.mesh);
    }

    /*
    Cureently the boids after a while will escape the bounds. This could be caused by 
    Accumulation of Small Errors:
        over long time small errors in pos calculations can add up
    Velocity Limits:
        Velocity might not be clapped correctly and leads to over shooting
    Boundary Force Strength:
        Boundary force might be too weak
    Position Updates:
        might want to make the position updates constraided by the bounds
    */

    move() {
        this.getCloseBoids();

        const acceleration = new THREE.Vector3(0,0,0);
        acceleration.add(this.border());
        acceleration.add(this.seperation());
        acceleration.add(this.alignment());
        acceleration.add(this.cohesion());
        //acceleration.multiplyScalar(delta_time);
        //console.log('Acceleration: ');
        //console.log(acceleration);

        this.velocity.add(acceleration);
        this.velocity.clampLength(0, BOID_CONST.maxSpeed);
        //console.log('Velocity: ');
        //console.log(this.velocity)

        this.mesh.position.add(this.velocity);
        this.acceleration.set(0,0,0);
        // const velocity_prime = new THREE.Vector3().copy(this.velocity);
        // velocity_prime.applyAxisAngle(Z_AXIS,-Math.PI/2);
        // //velocity_prime.multiplyScalar(delta_time);
        
        // this.mesh.position.add(velocity_prime);
        
        const face = new THREE.Vector3().copy(this.mesh.position).add(this.velocity);
        this.mesh.lookAt(face);
    }

    getCloseBoids() {
        this.close = []
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const posX = this.cubeX + dx
                    const posY = this.cubeY + dy
                    const posZ = this.cubeZ + dz

                    if (posX < 0 || posX >= CUBE_LEN || posY < 0 || posY >= CUBE_LEN || posZ < 0 || posZ >= CUBE_LEN) continue

                    const cell = BOID_CUBES[posX][posY][posZ]
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
        const steeringVector = new THREE.Vector3();
        if(this.mesh.position.x < this.xMin + BOID_CONST.margin)
        {
            steeringVector.x = BOID_CONST.maxSpeed;
        }
        else if (this.mesh.position.x > this.xMax - BOID_CONST.margin)
        {
            steeringVector.x = -BOID_CONST.maxSpeed;
        }
        if(this.mesh.position.y < this.yMin + BOID_CONST.margin)
        {
            steeringVector.y = BOID_CONST.maxSpeed;
        }
        else if (this.mesh.position.y > this.yMax - BOID_CONST.margin)
        {
            steeringVector.y = -BOID_CONST.maxSpeed;
        }
        if(this.mesh.position.z < this.zMin + BOID_CONST.margin)
        {
            steeringVector.z = BOID_CONST.maxSpeed;
        }
        else if (this.mesh.position.z > this.zMax - BOID_CONST.margin)
        {
            steeringVector.z = -BOID_CONST.maxSpeed;
        }
        return steeringVector;
    }

    // Steering Vector = Disired Vel vec - current vel vec
    seperation() {
        // Implementation for separation behavior
        const seperationVector = new THREE.Vector3();
        let count = 0;

        for (let boid of this.close)
        {
            console.log("Pos:");
            console.log(boid.mesh.position);
            let distance = this.mesh.position.distanceTo(boid.mesh.position);
            if (distance < BOID_CONST.sepRadius)
            {
                let vecTemp = new THREE.Vector3().subVectors(this.mesh.position, boid.mesh.position);
                vecTemp.normalize();
                vecTemp.divideScalar(Math.max(distance,0.05));
                seperationVector.add(vecTemp);
                count++;
            }
        }
        if (count > 0)
        {
            steeringVector.divideScalar(count);
            steeringVector.normalize();
            steeringVector.multiplyScalar(BOID_CONST.maxSpeed);
        }
        return seperationVector.multiplyScalar(BOID_CONST.weightSeperation);
    }

    alignment() {
        // Implementation for alignment 
        const alignmentVector = new THREE.Vector3();
        let count = 0;
        
        for (let boid of this.close)
        {
            alignmentVector.add(boid.velocity);
            count++;
        }
        if (count > 0)
        {
            alignmentVector.divideScalar(count);
            alignmentVector.normalize();
            alignmentVector.multiplyScalar(BOID_CONST.maxSpeed);
            alignmentVector.sub(this.velocity);
            alignmentVector.clampLength(0, BOID_CONST.maxSteering);
        }
        return alignmentVector.multiplyScalar(BOID_CONST.weightAlighment);
    }

    cohesion() {
        // Implementation for cohesion behavior
        const cohesionVector = new THREE.Vector3();
        let count = 0;
        for (let boid of this.close)
        {
            cohesionVector.add(boid.mesh.position);
            count++;
        }
        if (count > 0)
        {
            cohesionVector.divideScalar(count);
            let vecTemp = new THREE.Vector3().subVectors(cohesionVector, this.mesh.position);
            vecTemp.normalize();
            vecTemp.multiplyScalar(BOID_CONST.maxSpeed);
            cohesionVector.copy(vecTemp);
            cohesionVector.sub(this.velocity);
            cohesionVector.clampLength(0, BOID_CONST.maxSteering);
        }
        return cohesionVector.multiplyScalar(BOID_CONST.weightCohesion);
    }

}

function initialize_boids() {
  for (let i = 0; i < BOID_CONST.boidNum; i++) {
    let boid = new Boid();
    boids.push(boid);
  }
}

function updateBoidCubes()
{
    for (let cubeIndex of nonEmptyCubes) {
        let [x, y , z] = cubeIndex.split(' ').map(Number);
        BOID_CUBES[x][y][z] = [];
    }
    nonEmptyCubes.clear();

    for (let boid of boids) {
        let x = Math.floor(boid.mesh.position.x / (terrariumDimensions.width / CUBE_LEN));
        let y = Math.floor(boid.mesh.position.y / (terrariumDimensions.height / CUBE_LEN));
        let z = Math.floor(boid.mesh.position.z / (terrariumDimensions.depth / CUBE_LEN));
        x = Math.max(0, Math.min(x,CUBE_LEN - 1));
        y = Math.max(0, Math.min(y,CUBE_LEN - 1));
        z = Math.max(0, Math.min(z,CUBE_LEN - 1));
        boid.cubeX = x;
        boid.cubeY = y;
        boid.cubeZ = z;
        BOID_CUBES[x][y][z].push(boid);
        nonEmptyCubes.add(x + ' ' + y + ' ' + z);
    }

}
/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()


// LITTLE GUI STUFF

// gui.add(terrariumDimensions, 'width').min(1).max(20).step(0.1).onChange(() => {
//     ground.geometry.dispose()
//     ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

//     container.geometry.dispose()
//     container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
// })
// gui.add(terrariumDimensions, 'height').min(1).max(20).step(0.1).onChange(() => {
//     ground.geometry.dispose()
//     ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

//     ground.position.y = - terrariumDimensions.height / 2

//     container.geometry.dispose()
//     container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

//     container.position.y = terrariumDimensions.height / 2

// })
// gui.add(terrariumDimensions, 'depth').min(1).max(20).step(0.1).onChange(() => {
//     ground.geometry.dispose()
//     ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

//     container.geometry.dispose()
//     container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
// })

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
    new THREE.MeshPhongMaterial({ color: '#c7f5fb', transparent: true, opacity: 0.2, shininess: 100, side: THREE.DoubleSide })
)
container.position.set(terrariumDimensions.width / 2, terrariumDimensions.height / 2, terrariumDimensions.depth / 2)
terrarium.add(container)

scene.add(terrarium)



/**
 * Objects
 */
function makeObject(geometry, material) {
    const object = new THREE.Mesh(
        geometry,
        material
    )

    object.position.x = (Math.random() - 0.5) * 10
    object.position.y = Math.random() * 5
    object.position.z = (Math.random() - 0.5) * 10
    object.rotation.x = Math.random() * Math.PI

    object.castShadow = true
    object.material.shininess = 100
    object.material.roughness = 0.5
    object.material.metalness = 0.5

    return object
}

debugObject.makeSphere = () => {
    const object = makeObject(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }))
    scene.add(object)
    objects.push(object)
    object.geometry.computeBoundingBox()
}

debugObject.makeBox = () => {
    const object = makeObject(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }))
    scene.add(object)
    objects.push(object)
    object.geometry.computeBoundingBox()
}

debugObject.makeDonut = () => {
    const object = makeObject(new THREE.TorusGeometry() , new THREE.MeshPhongMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) }))
    scene.add(object)
    objects.push(object)
    object.geometry.computeBoundingBox()
}

gui.add(debugObject, 'makeSphere')
gui.add(debugObject, 'makeBox')
gui.add(debugObject, 'makeDonut')

const objects = [
    makeObject(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshPhongMaterial({ color: 'gray' })),
    makeObject(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshPhongMaterial({ color: 'blue' })),
    makeObject(new THREE.TorusGeometry(), new THREE.MeshPhongMaterial({ color: 'red' })),
]

/*
objects.forEach((object) => {
    object.geometry.computeBoundingBox()
    scene.add(object)
})
*/

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0xffffff, 20, 20, 2)
pointLight.castShadow = true
pointLight.position.x = 0
pointLight.position.y = 3
pointLight.position.z = 0
scene.add(pointLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

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
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000); // Increase far plane to 1000
camera.position.set(80, 80, 160); // Move the camera further back
//camera.lookAt(terrarium.position); // Ensure the camera looks at the center of the terrarium
scene.add(camera);

/**
 * Controls
 */
// Orbit Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Transform Controls
let prevPosition = new THREE.Vector3()
let prevScale = new THREE.Vector3()

const transformControls = new TransformControls(camera, canvas)
transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value
    prevPosition.copy(transformControls.object.position)
    prevScale.copy(transformControls.object.scale)
})

transformControls.addEventListener('change', () => {
    if (!transformControls.object) return
    // Clamp Scale
    transformControls.object.scale.x = Math.min(Math.max(transformControls.object.scale.x, 0.5), 3)
    transformControls.object.scale.y = Math.min(Math.max(transformControls.object.scale.y, 0.5), 3)
    transformControls.object.scale.z = Math.min(Math.max(transformControls.object.scale.z, 0.5), 3)

    // Clamp Position
    const boundingBox = new THREE.Box3().setFromObject(transformControls.object)
    const dimensions = new THREE.Vector3()
    boundingBox.getSize(dimensions)

    let clampedPosition = new THREE.Vector3().copy(transformControls.object.position)

    clampedPosition.x = Math.min(Math.max(clampedPosition.x, - terrariumDimensions.width / 2 + dimensions.x / 2), terrariumDimensions.width / 2 - dimensions.x / 2)
    clampedPosition.y = Math.min(Math.max(clampedPosition.y, terrarium.position.y + dimensions.y / 2), terrariumDimensions.height + terrarium.position.y - dimensions.y / 2)
    clampedPosition.z = Math.min(Math.max(clampedPosition.z, - terrariumDimensions.depth / 2 + dimensions.z / 2), terrariumDimensions.depth / 2 - dimensions.z / 2)

    transformControls.object.position.copy(clampedPosition)
}
)

scene.add(transformControls)

objects.forEach((object, index) => {
    object.addEventListener('click', () => {
        transformControls.attach(object)
        prevPosition.copy(object.position)
        prevScale.copy(object.scale)
    })
})

/**
 * Mouse events
 */
window.addEventListener('click', (event) => {
    // Mouse coordinates
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1

    // Raycaster
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(objects)

    if (intersects.length) {
        const object = intersects[0].object

        transformControls.attach(object)
    } else {
        transformControls.detach()
    }
})

window.addEventListener('keydown', (event) => {
    if (event.key === 'r') {
        transformControls.mode = transformControls.mode === 'translate' ? 'rotate'
            : transformControls.mode === 'rotate' ? 'scale'
                : 'translate'
    } else if (event.key === 'Backspace') {
        if (transformControls.object) {
            scene.remove(transformControls.object)
            objects.splice(objects.indexOf(transformControls.object), 1)
            transformControls.object.geometry.dispose()
            transformControls.object.material.dispose()
            transformControls.detach()
        }
    }
})


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()



let lastResetTime = 0;
const resetInterval = 3;

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }

const tick = async () => {
    const elapsedTime = clock.getElapsedTime()
    const delta_time = clock.getDelta()

    // Update controls
    controls.update()

    updateBoidCubes();

    for (let boid of boids) {
      boid.move()
    }

    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}
initialize_boids();
tick()
//console.log(boids);
