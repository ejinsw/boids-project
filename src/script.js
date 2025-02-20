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
    new THREE.MeshPhongMaterial({ color: '#c7f5fb', transparent: true, opacity: 0.2, shininess: 100 })
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

const objects = [
    makeObject(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 'gray' })),
    makeObject(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshPhongMaterial({ color: 'blue' })),
    makeObject(new THREE.ConeGeometry(1, 2, 16), new THREE.MeshPhongMaterial({ color: 'red' })),
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

objects.forEach((object, index) => {
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
    const intersects = raycaster.intersectObjects(objects)

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

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()