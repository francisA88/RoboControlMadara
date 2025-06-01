// Base Yaw Slider implementation
document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('container');

    // Create canvas container
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'arc-canvas-container';
    container.appendChild(canvasContainer);

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'arc-canvas';
    canvas.width = 250;
    canvas.height = 125;
    canvasContainer.appendChild(canvas);

    // Create yaw value display
    const yawValueDisplay = document.createElement('div');
    yawValueDisplay.className = 'yaw-value';
    yawValueDisplay.textContent = '0°';
    container.appendChild(yawValueDisplay);

    // Create the indicator element
    const indicator = document.createElement('div');
    indicator.classList.add('indicator');
    canvasContainer.appendChild(indicator);

    // Get canvas context
    const ctx = canvas.getContext('2d');

    // Constants for the arc
    const startAngle = -90;
    const endAngle = 90;
    const centerX = canvas.width / 2;
    const radius = canvas.height;
    const lineWidth = 6;

    // Set initial position
    let currentAngle = 0;

    // Draw the arc on the canvas
    function drawArc() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the arc (semi-circle)
        ctx.beginPath();
        ctx.arc(centerX, canvas.height, radius, Math.PI, 0, false);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = '#800';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        ctx.stroke();

        // Draw angle labels
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ff3333';
        ctx.textAlign = 'center';

        // -90 degree label
        ctx.fillText('-90°', 0, canvas.height + 20);

        // 0 degree label
        ctx.fillText('0°', centerX, 0);

        // 90 degree label
        ctx.fillText('90°', canvas.width, canvas.height + 20);
    }

    // Function to update indicator position
    function updateIndicator(angle) {
        // Constrain angle between -90 and 90
        angle = Math.max(startAngle, Math.min(endAngle, angle));


        // Convert angle from -90:90 to 0:180 degrees in radians (inverse order)
        const angleInRadians = ((angle + 90) / 180) * Math.PI;

        // Calculate position on the arc
        const x = centerX + radius * Math.cos(angleInRadians);
        const y = canvas.height - radius * Math.sin(angleInRadians);

        // Update indicator position
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;

        // Update yaw value display
        yawValueDisplay.textContent = `${Math.round(angle)}°`;

        // Send command to robot if function exists
        if (typeof updateState === 'function') {
            updateState(9, angle);
        }
    }

    // Draw the arc initially
    drawArc();

    // Initialize indicator position
    updateIndicator(currentAngle);

    // Add drag functionality
    let isDragging = false;

    // Mouse events
    indicator.addEventListener('mousedown', (event) => {
        isDragging = true;
        event.stopPropagation();
        event.preventDefault();
    });

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // If clicked on indicator do nothing
        if (event.target === indicator) return;

        const dx = x - centerX;
        const dy = canvas.height - y;
        let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) - 90;

        // For clicks, we allow jumping to new position, but still constrain the range
        angleDeg = Math.max(-90, Math.min(90, angleDeg));

        currentAngle = angleDeg;
        updateIndicator(currentAngle);
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.addEventListener('mousemove', (event) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Calculate raw dx/dy
        const dx = x - centerX;
        const dy = canvas.height - y;

        // Use current angle to prevent large jumps
        let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) - 90;

        // Prevent jumping from -90 to 90 by checking if we're at the edge
        if (currentAngle <= -85 && angleDeg > 0) {
            angleDeg = -90;
        } else if (currentAngle >= 85 && angleDeg < 0) {
            angleDeg = 90;
        }

        // Normal bounding
        angleDeg = Math.max(-90, Math.min(90, angleDeg));

        currentAngle = angleDeg;
        updateIndicator(currentAngle);
    });

    // Touch events for mobile
    indicator.addEventListener('touchstart', (event) => {
        isDragging = true;
        event.preventDefault();
        event.stopPropagation();
    });

    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    document.addEventListener('touchmove', (event) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Calculate raw dx/dy
        const dx = x - centerX;
        const dy = canvas.height - y;

        // Use current angle to prevent large jumps
        let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) - 90;

        // Prevent jumping from -90 to 90 by checking if we're at the edge
        if (currentAngle <= -85 && angleDeg > 0) {
            angleDeg = -90;
        } else if (currentAngle >= 85 && angleDeg < 0) {
            angleDeg = 90;
        }

        // Normal bounding
        angleDeg = Math.max(-90, Math.min(90, angleDeg));

        currentAngle = angleDeg;
        updateIndicator(currentAngle);
        event.preventDefault();
    });

    // Handle window resize to keep everything proportional
    window.addEventListener('resize', () => {
        drawArc();
        updateIndicator(currentAngle);
    });
});