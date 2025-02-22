import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { TransformControls } from 'three/examples/jsm/Addons.js'

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
var boid_count = 1;
var boids = [];

// Weights
const WEIGHT_SEPERATION = 0.1;
const WEIGHT_COHESION = 0.1;
const WEIGHT_ALIGNMENT = 0.1;

const BOID_RADIUS = 2;
const MAX_SPEED = 0.07;
const MAX_STEERING = 0.3;
const MARGIN = 3;

/**
 * Terrarium
 */
const terrariumDimensions = {
    width: 15,
    height: 10,
    depth: 15
}

const BoidGeometry = new THREE.ConeGeometry(0.2,0.7,32);
BoidGeometry.translate(0, .35, 0);
BoidGeometry.rotateX(Math.PI / 2);
const BoidMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});

/*
 *
 * Boid Constants
 * 
 */
const BOID_CONST = {
    radius: 2,
    maxSpeed: 0.1,
    maxSteering: 0.001,
    margin: 2
}

class Boid {
    constructor()  {
        this.mesh = new THREE.Mesh(BoidGeometry, BoidMaterial);
        this.mesh.geometry.rotateZ(Math.PI / 2);
        this.mesh.visible = true;
        this.mesh.position.set((Math.random() - 0.5) * terrariumDimensions.width,
                               (Math.random() - 0.5) * terrariumDimensions.height,
                               (Math.random() - 0.5) * terrariumDimensions.depth);
        this.mesh.lookAt(Math.random()/200, Math.random()/200, Math.random()/200);

        //this.velocity = new THREE.Vector3(Math.random() - 0.5, 1 + Math.random() -0.5, Math.random() -0.5).normalize();
       // this.mesh.localToWorld(this.velocity);
        //this.velocity.sub(this.mesh.position);
        this.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() -0.5, Math.random() -0.5).normalize();

        const face = new THREE.Vector3().copy(this.velocity).add(this.mesh.position);
        this.mesh.lookAt(face);
        //this.acceleration = new THREE.Vector3();
        // TODO: Add Bounds
        this.xMin = terrariumDimensions.width / -2;
        this.xMax = terrariumDimensions.width / 2;
        this.yMin = terrariumDimensions.height / -4 - 3; // Bottom of teranium 
        this.yMax = terrariumDimensions.height / 4 - 3; // Bottom of Teranium
        this.zMin = terrariumDimensions.depth / -2;
        this.zMax = terrariumDimensions.depth / 2;
        scene.add(this.mesh);
    }

    move() {

        // TODO: Apply steering force when close to boundaries
        let distXMin = this.mesh.position.x - this.xMin;
        let distXMax = this.xMax - this.mesh.position.x;
        let distYMin = this.mesh.position.y - this.yMin;
        let distYMax = this.yMax - this.mesh.position.y; 
        let distZMin = this.mesh.position.z - this.zMin;
        let distZMax = this.zMax - this.mesh.position.z;
        const steeringVector = new THREE.Vector3();
        if (distXMin < BOID_CONST.margin) {
            steeringVector.x += BOID_CONST.maxSteering * (1 - distXMin/BOID_CONST.margin); 
        }
        else if (distXMax < BOID_CONST.margin) {
            steeringVector.x -= BOID_CONST.maxSteering * (1 - distXMax/BOID_CONST.margin); 
        }
        //console.log(distXMin);
        //console.log(distXMax);
        //console.log(BOID_CONST.margin);
        //console.log('\n');

        if (distYMin < BOID_CONST.margin) {
            steeringVector.y += BOID_CONST.maxSteering * (1 - distYMin/BOID_CONST.margin); 
        }
        else if (distYMax < BOID_CONST.margin) {
            steeringVector.y -= BOID_CONST.maxSteering * (1 - distYMax/BOID_CONST.margin);
        }

        if (distZMin < BOID_CONST.margin) {
            steeringVector.z += BOID_CONST.maxSteering * (1 - distZMin/BOID_CONST.margin); 
        }
        else if (distZMax < BOID_CONST.margin) {
            steeringVector.z -= BOID_CONST.maxSteering * (1 - distZMax/BOID_CONST.margin);
        }


        this.seperation()
        this.alignment()
        this.cohesion()

        //const movementVector = new THREE.Vector3(0,1,0);
        //this.mesh.localToWorld(movementVector);
        //movementVector.sub(this.mesh.position);
        const movementVector = new THREE.Vector3(0,0,0);
        movementVector.sub(this.mesh.position);

        movementVector.add(steeringVector);
        this.velocity.add(movementVector);
        this.velocity.clampLength(0, BOID_CONST.maxSpeed);
        this.mesh.position.add(this.velocity);

        console.log(this.velocity);

        const diretion = this.velocity.clone().normalize();
        const face = this.mesh.position.clone().add(diretion);
        this.mesh.lookAt(face);
    }

    seperation() {

    }
    alignment() {

    }
    cohesion() {

    }
}

function initialize_boids() {
  for (let i = 0; i < boid_count; i++) {
    let boid = new Boid();
    boids.push(boid);
  }
}
/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()



gui.add(terrariumDimensions, 'width').min(1).max(20).step(0.1).onChange(() => {
    ground.geometry.dispose()
    ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
})
gui.add(terrariumDimensions, 'height').min(1).max(20).step(0.1).onChange(() => {
    ground.geometry.dispose()
    ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

    ground.position.y = - terrariumDimensions.height / 2

    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

    container.position.y = terrariumDimensions.height / 2

})
gui.add(terrariumDimensions, 'depth').min(1).max(20).step(0.1).onChange(() => {
    ground.geometry.dispose()
    ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)

    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
})

const terrarium = new THREE.Group()

const ground = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: 'lightgreen' })
)
ground.position.y = - terrariumDimensions.height / 2
ground.receiveShadow = true
terrarium.add(ground)

const container = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: '#c7f5fb', transparent: true, opacity: 0.2, shininess: 100, side: THREE.DoubleSide })
)
container.position.y = terrariumDimensions.height / 2
terrarium.add(container)

terrarium.position.y = - 3

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

objects.forEach((object) => {
    object.geometry.computeBoundingBox()
    scene.add(object)
})

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 5, 15)
scene.add(camera)

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

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    if (elapsedTime - lastResetTime >= resetInterval) {
        // Remove all current boids from the scene
        boids.forEach(boid => {
            scene.remove(boid.mesh); // Adjust based on your boid structure
        });
        boids = []; // Clear the array
        initialize_boids(); // Reinitialize new boids
        lastResetTime = elapsedTime; // Update the reset timer
    }
    // Render
    renderer.render(scene, camera)

    for (let boid of boids) {
      boid.move()
    }

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}
initialize_boids();
tick()
console.log(boids);
/*
function getBoidsInRange(boid,boids) {
    return boids.filter(b =>
        b !== this &&
        b.poistion.distanceTo(boid.position) <= BOID_RADIUS &&
        isInVisionCone(boid,b)
    );
}


function isInVisionCone(boid,b) {
    let vecToOther = b.clone().sub(boid.position).normalize();
    let dot = boid.position.dot(vecToOther);
    return dot > 0;
}
    */

    // Attemption to add you tubes version
    /*
    for (let boid of boids) {
        const velocity = new THREE.Vector3(0,1,0);
        boid.localToWorld(velocity);
        velocity.sub(boid.position);
       
        let boidsInRange = getBoidsInRange(boid,boids);
        for (let b of boidsInRange) {
          let ratio = 1 - Math.min(1,boid.position.distanceTo(b.position)/BIOD_RADIUS);
          velocity.add(clone().sub(boid.position).addScalar(ratio));
        }
        velocity.setLength(0.2);
        boid.position.add(velocity);
      }
  */