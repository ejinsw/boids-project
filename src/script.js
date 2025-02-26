import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { TransformControls } from 'three/examples/jsm/Addons.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#87ceeb')

// Raycaster
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
var boid_count = 3;
var boids = [];

const BoidGeometry = new THREE.ConeGeometry(0.2,0.7,32);
const BoidMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});

const point_geometry = new THREE.SphereGeometry(0.1, 16,16);
const point_material = new THREE.MeshBasicMaterial({color: 0x282828});

function initialize_boids() {
  for (let i = 0; i < boid_count; i++) {
    const boid = {
      mesh: new THREE.Mesh(BoidGeometry, BoidMaterial),
      velocity: new THREE.Vector3(Math.random()/200, Math.random()/200, Math.random()/200),
      seperation: new THREE.Vector3(0,0,0),
      alignment: new THREE.Vector3(0,0,0),
      cohesion: new THREE.Vector3(0,0,0),
      vision_cone: new Array(),
    }
    boid.mesh.position.set((Math.random() - 0.5) * terrariumDimensions.width, (Math.random() - 0.5) * terrariumDimensions.height + 2, (Math.random() - 0.5) * terrariumDimensions.depth);
    boid.mesh.lookAt(boid.velocity);

    const vision_cone = generate_vision_cone(40,100);
    for (let j = 0; j < vision_cone.length; j++) {
      const point_pos = vision_cone[j].clone();
      const point = new THREE.Mesh(point_geometry, point_material);
      point.position.copy(point_pos);
      boid.vision_cone.push(point);
      boid.mesh.add(point);
    }
    console.log(boid.vision_cone)
    boids.push(boid);
    scene.add(boid.mesh);

  }
}

function generate_vision_cone(fov, samples) {
  // fov in degrees
  const phi = Math.PI * (Math.sqrt(5) - 1); 
  const fov_radians = fov * (Math.PI / 180);
  // golden angle in radians
  let points = [];
  for (let i = 0; i < samples; i++) {
    let y = 1 - ((i/(samples-1)) *2);
    if (y >= Math.cos(fov_radians)) {
      let radius = Math.sqrt(1- (y*y));
      let theta = phi * i;
      let x = Math.cos(theta) * radius;
      let z = Math.sin(theta) * radius;
      const point = new THREE.Vector3(x,y,z);
      points.push(point);
    } else {
      return points;
    }
  }
  return points;
}

function avoid_obstactles(boids) {
  for (let i = 0; i < boids.length; i++) {
    const raycaster = new THREE.Raycaster();
    const mesh = boids[i].mesh;
    let intersect = false;

    for (let j = 0; j < boids[i].vision_cone.length; j++) {
      const direction = new THREE.Vector3();
      const point = boids[i].vision_cone[j].clone();
      mesh.localToWorld(point);
      direction.subVectors(point, mesh.position).normalize();

      raycaster.set(mesh.position, direction);

      for (let k = 0; k < objects.length; k++) {
        const intersections = raycaster.intersectObject(objects[k]);
        if (intersections.length > 0) {
          intersect = true;
          break;
        }
      }

      if (intersect) {
        console.log("Object intersects with at least one vector");
      } else {
        console.log("No intersections found");
      }

    }
  }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()

/**
 * Terrarium
 */
const terrariumDimensions = {
    width: 15,
    height: 10,
    depth: 15
}

gui.add(terrariumDimensions, 'width').min(1).max(20).step(0.1).onChange(() => {
    ground.geometry.dispose()
    ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, 2, terrariumDimensions.depth)

    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
})
gui.add(terrariumDimensions, 'height').min(1).max(20).step(0.1).onChange(() => {
    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
    container.position.y = terrariumDimensions.height / 2

})
gui.add(terrariumDimensions, 'depth').min(1).max(20).step(0.1).onChange(() => {
    ground.geometry.dispose()
    ground.geometry = new THREE.BoxGeometry(terrariumDimensions.width, 2, terrariumDimensions.depth)

    container.geometry.dispose()
    container.geometry = new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth)
})

const terrarium = new THREE.Group()

const ground = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, 2, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: 'lightgreen' })
)
ground.position.y = 0; 
ground.receiveShadow = true
terrarium.add(ground)

const container = new THREE.Mesh(
    new THREE.BoxGeometry(terrariumDimensions.width, terrariumDimensions.height, terrariumDimensions.depth),
    new THREE.MeshPhongMaterial({ color: '#c7f5fb', transparent: true, opacity: 0.2, shininess: 100 })
)
container.position.y = terrariumDimensions.height / 2 + 1;
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

const movingobjects = [
    makeObject(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 'gray' })),
    makeObject(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshPhongMaterial({ color: 'blue' })),
    makeObject(new THREE.ConeGeometry(1, 2, 16), new THREE.MeshPhongMaterial({ color: 'red' })),
]
const objects = [...movingobjects, container, ground]

movingobjects.forEach((object) => {
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
const transformControls = new TransformControls(camera, canvas)
transformControls.addEventListener('dragging-changed', (event) => {
    controls.enabled = !event.value
    prevPosition.copy(transformControls.object.position)
})

transformControls.addEventListener('change', () => {
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

movingobjects.forEach((object, index) => {
    object.addEventListener('click', () => {
        transformControls.attach(object)
        prevPosition.copy(object.position)
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
    const intersects = raycaster.intersectObjects(movingobjects)

    if (intersects.length) {
        const object = intersects[0].object

        transformControls.attach(object)
    }
})

window.addEventListener('keydown', (event) => {
    if (event.key === 'r') {
        transformControls.mode = transformControls.mode === 'translate' ? 'rotate'
            : transformControls.mode === 'rotate' ? 'scale'
                : 'translate'
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

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
    avoid_obstactles(boids);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
initialize_boids()


