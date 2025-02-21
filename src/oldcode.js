class Boid {
    constructor()  {
        this.mesh = new THREE.Mesh(BoidGeometry, BoidMaterial);
        this.mesh.visible = true;
        this.mesh.position.set((Math.random() - 0.5) * terrariumDimensions.width,
                               (Math.random() - 0.5) * terrariumDimensions.height,
                               (Math.random() - 0.5) * terrariumDimensions.depth);
        this.mesh.lookAt(Math.random()/200, Math.random()/200, Math.random()/200);
        this.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() -0.5, Math.random() -0.5).normalize();
        //this.acceleration = new THREE.Vector3();
        // TODO: Add Bounds
        this.xMin = terrariumDimensions.width / -4;
        this.xMax = terrariumDimensions.width / 4;
        this.yMin = terrariumDimensions.height / -4 - 3;
        this.yMax = terrariumDimensions.height / 4 - 3;
        this.zMin = terrariumDimensions.depth / -4;
        this.zMax = terrariumDimensions.depth / 4;
        scene.add(this.mesh);
    }

    move() {
        console.log("Boid moving:", this.mesh.position);
        // TODO: Calc distance from bounds
        let distXMin = this.mesh.position.x - this.xMin;
        let distXMax = this.xMax - this.mesh.position.x;
        let distYMin = this.mesh.position.y - this.yMin;
        let distYMax = this.yMax - this.mesh.position.y; 
        let distZMin = this.mesh.position.z - this.zMin;
        let distZMax = this.zMax - this.mesh.position.z;
        // Movement Vector
        const steerVector = new THREE.Vector3();
        const movementVector = new THREE.Vector3(0,1,0);
        this.mesh.localToWorld(movementVector);
        movementVector.setLength(0.1);
        movementVector.sub(this.mesh.position);
        // TODO: Apply steering force when close to boundaries
        if (distXMin < MARGIN) {
            steerVector.x += MAX_STEERING * (1 - distXMin/MARGIN); 
        }
        else if (distXMax < MARGIN) {
            steerVector.x -= MAX_STEERING * (1 - distXMax/MARGIN); 
        }
        if (distYMin < MARGIN) {
            steerVector.y += MAX_STEERING * (1 - distYMin/MARGIN); 
        }
        else if (distYMax < MARGIN) {
            steerVector.y -= MAX_STEERING * (1 - distYMax/MARGIN);
        }
        if (distZMin < MARGIN) {
            steerVector.z += MAX_STEERING * (1 - distZMin/MARGIN); 
        }
        else if (distZMax < MARGIN) {
            steerVector.z -= MAX_STEERING * (1 - distZMax/MARGIN);
        }
        // TODO: Velocity -> Acceleration and limit max speed
        //this.acceleration.add(movementVector);
        //this.velocity.add(this.acceleration);
        this.velocity.add(movementVector);
        // TODO: FIX STEER
        //this.velocity.add(steerVector);
        this.velocity.clampLength(0, MAX_SPEED);
        this.mesh.position.add(this.velocity);
        //this.acceleration.set(0,0,0);
        // Face of boid to face of movement
        
        const face = new THREE.Vector3().copy(this.velocity).add(this.mesh.position);
        this.mesh.lookAt(face);
        /*
        const seperationVector = this.seperation();
        //this.acceleration.add(seperationVector);
        velocity.add(seperationVector);
        const alignmentVector = this.alignment();
        //this.acceleration.add(alignmentVector);
        velocity.add(alignmentVector);
        const cohesionVector = this.cohesion();
        //this.acceleration.add(cohesionVector);
        velocity.add(cohesionVector);
        */