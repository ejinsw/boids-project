import * as THREE from 'three'

function getClosestBoids(boid) {
    //Number of boids to return
    const NUM_CLOSEST = 7;

    //Quick Implementaion
    const sortedBoids = boids.slice();
    sortedBoids.sort((a,b) => boid.position.distanceTo(a.position) - boid.position.distanceTo(b.position));

    return sortedBoids.slice(1,n + 1);

    //Next Implementation Thinking of using a min Heap for the array
}

const velocity = new THREE.Vector3(0,1,0);
      boid.localToWorld(velocity);
      velocity.sub(boid.position);
      velocity.setLength(0.1);
      boid.position.add(velocity);

function applySeperation() {

    for (let boid of Boids) {
        let closestBoids = getClosestBoids();
        let vectorSeperation = new THREE.Vector3();
        for (let i = 0; i < closestBoids.length; i++){
            let vectorDistance = new THREE.Vector3().subVectors(boid.position,closestBoid[i].position);
            vectorSeperation.add(vectorDistance);
        }
        const velocity = new THREE.Vector3(0,1,0);
        boid.localToWorld(velocity);
        velocity.sub(boid.position);
        vectorSeperation.addScalar(WEIGHT_SEPERATION/boid_count);
        vectorSeperation.add(velocity);
        vectorSeperation.setLength(0.1); // This can change
        boid.position.add(vectorSeperation);
    }
}

function getAvgCenter() {

    let xPos = 0;
    let yPos = 0;
    let zPos = 0;

    for (let boid of boids) {
        xPos += boid.position.x;
        yPos += boid.position.y;
        zPos += boid.position.z;
    }

    return new THREE.Vector3(xPos/boid_count,yPos/boid_count,zPos/boid_count);
}

function applyCohesion() {

    let avgPos = getAvgCenter();

    for (let boid of boids) {
        let vectorCohesion = new THREE.Vector3().subVectors(avgPos, boid.position); // Vec points from boid.pos to avgPos
        const velocity = new THREE.Vector3(0,1,0);
        boid.localToWorld(velocity);
        velocity.sub(boid.position);
        vectorCohesion.addScalar(WEIGHT_COHESION);
        vectorCohesion.add(velocity);
        vectorCohesion.setLength(0.1); // This can change
        boid.position.add(vectorCohesion);
    }
}

// Working on allignment
function getAvgAlignment() {
    const avgAlignment = new THREE.Vector3();
    for (let boid of boids) {
        const velocity = new THREE.Vector3(0,1,0);
        boid.localToWorld(velocity);
        velocity.sub(boid.position);  
        avgAlignment.add(velocity);
    }
    return avgAlignment.addScalar(1/boid_count);
}

function applyAlignment() {
    const avgAlignment = getAvgAlignment();
    for (let boid of boids) {
        const vectorAlignment = new THREE.Vector3().subVectors(avgAlignment,boid.position);
        const velocity = new THREE.Vector3(0,1,0);
        boid.localToWorld(velocity);
        velocity.sub(boid.position);
        vectorAlignment.addScalar(WEIGHT_ALIGNMENT);
        vectorAlignment.add(velocity);
        vectorAlignment.setLength(0.1); // This can change
        boid.position.add(vectorAlignment);
    }
}