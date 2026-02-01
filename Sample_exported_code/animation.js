// Generated Animation Code
// Using GSAP (GreenSock Animation Platform)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('animation-container');
    
    // Create timeline
    const tl = gsap.timeline({ 
        repeat: 0,
        defaults: { duration: 1, ease: "power1.inOut" }
    });
    
    // Create circle_1
    const element_1769909902000 = document.createElement('div');
    element_1769909902000.id = 'element_1769909902000';
    element_1769909902000.style.position = 'absolute';
    element_1769909902000.style.transformOrigin = 'center center';
    container.appendChild(element_1769909902000);
    
    // Create Drawing_1 (SVG Path)
    const path_1769909941271_container = document.createElement('div');
    path_1769909941271_container.id = 'path_1769909941271_container';
    path_1769909941271_container.style.position = 'absolute';
    path_1769909941271_container.style.transformOrigin = 'center center';
    path_1769909941271_container.style.width = '120px';
    path_1769909941271_container.style.height = '95px';
    
    const path_1769909941271 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    path_1769909941271.id = 'path_1769909941271';
    path_1769909941271.style.position = 'absolute';
    path_1769909941271.style.left = '0';
    path_1769909941271.style.top = '0';
    path_1769909941271.style.overflow = 'visible';
    path_1769909941271.style.pointerEvents = 'none';
    path_1769909941271.setAttribute('width', '120');
    path_1769909941271.setAttribute('height', '95');
    path_1769909941271.setAttribute('viewBox', '0 0 120 95');
    
    const path_path_1769909941271 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_path_1769909941271.setAttribute('d', 'M 46 497 Q 46 496 53 490 Q 60 484 62.5 482.5 Q 65 481 68 480.5 Q 71 480 78 479 Q 85 478 89 477 Q 93 476 94.5 476 Q 96 476 97 476 Q 98 476 98 478 Q 98 480 97 483 Q 96 486 94 488.5 Q 92 491 90.5 493 Q 89 495 86.5 497.5 Q 84 500 80.5 503.5 Q 77 507 75.5 509.5 Q 74 512 71 514.5 Q 68 517 66.5 518 Q 65 519 63.5 521 Q 62 523 61.5 523.5 Q 61 524 61 524.5 Q 61 525 60.5 526 Q 60 527 59.5 528.5 Q 59 530 58 531.5 Q 57 533 56.5 535.5 Q 56 538 55.5 540.5 Q 55 543 55 544 Q 55 545 55 547 Q 55 549 55 549.5 Q 55 550 55 550.5 Q 55 551 56 551 Q 57 551 59 551.5 Q 61 552 62 552 Q 63 552 64.5 552 Q 66 552 66.5 552 Q 67 552 69 552 Q 71 552 72 552 Q 73 552 74 552 Q 75 552 76.5 552 Q 78 552 80.5 550.5 Q 83 549 83.5 548.5 Q 84 548 87 547 Q 90 546 92 544.5 Q 94 543 97 540 Q 100 537 100.5 535.5 Q 101 534 103 530.5 Q 105 527 106.5 524.5 Q 108 522 109.5 517.5 Q 111 513 111.5 511.5 Q 112 510 113 507.5 Q 114 505 114 504.5 Q 114 504 114.5 502 Q 115 500 115 499.5 Q 115 499 115.5 499 Q 116 499 121 499 Q 126 499 127 499 Q 128 499 129.5 499 Q 131 499 131.5 499 Q 132 499 132.5 499.5 Q 133 500 134.5 502 Q 136 504 136 505 Q 136 506 136.5 509 Q 137 512 137.5 513 Q 138 514 139 517 Q 140 520 140 521 Q 140 522 140 522.5 Q 140 523 140 525 Q 140 527 140 527.5 Q 140 528 140 529 Q 140 530 136.5 534 Q 133 538 131.5 538.5 Q 130 539 129.5 540 Q 129 541 128.5 541.5 Q 128 542 127.5 542.5 Q 127 543 126 543.5 Q 125 544 127.5 545.5 Q 130 547 131.5 547.5 Q 133 548 134 548.5 Q 135 549 138 550 Q 141 551 141.5 551 Q 142 551 142.5 551 Q 143 551 143.5 551 Q 144 551 144.5 551 Q 145 551 145.5 551 Q 146 551 147.5 551 Q 149 551 149.5 551 Q 150 551 150.5 551 Q 151 551 152 549 Q 153 547 155.5 544 Q 158 541 159.5 537 Q 161 533 162 531 Q 163 529 163.5 521 Q 164 513 165 510.5 Q 166 508 166 502 Q 166 496 166 492 Q 166 488 166 485.5 Q 166 483 166 481.5 Q 166 480 165 477 Q 164 474 163.5 473.5 Q 163 473 162.5 472.5 Q 162 472 160.5 472 Q 159 472 158.5 471.5 Q 158 471 156.5 470.5 Q 155 470 153.5 469.5 Q 152 469 151 469 Q 150 469 146 467.5 Q 142 466 140 465 Q 138 464 135.5 463.5 Q 133 463 132.5 462.5 Q 132 462 130.5 462 Q 129 462 127.5 462 Q 126 462 125.5 461.5 Q 125 461 123.5 461 Q 122 461 121 461 Q 120 461 119.5 461 Q 119 461 117 460 Q 115 459 114.5 459 Q 114 459 113 459 Q 112 459 111 459 Q 110 459 109.5 459 Q 109 459 108.5 458.5 Q 108 458 107.5 458 Q 107 458 106.5 458 Q 106 458 105 458 Q 104 458 102.5 457.5 Q 101 457 100.5 457 Q 100 457 99.5 457 Q 99 457 98.5 457 Q 98 457 97.5 457 Q 97 457 95 457 Q 93 457 92.5 457 Q 92 457 90 457 Q 88 457 83 457 Q 78 457 74.5 457 Q 71 457 69 457 Q 67 457 66.5 457 Q 66 457 65.5 457 Q 65 457 64 457 Q 63 457 61 457 Q 59 457 58.5 458 Q 58 459 57.5 459.5 Q 57 460 57 460.5 Q 57 461 56 462 Q 55 463 54.5 464.5 Q 54 466 53.5 467 Q 53 468 53 468.5 Q 53 469 52.5 470.5 Q 52 472 52 473 Q 52 474 52 474.5 Q 52 475 51.5 475.5 Q 51 476 51 476.5 Q 51 477 51 478 Q 51 479 51 479.5 Q 51 480 50 480.5 Q 49 481 49 481.5 Q 49 482 49 482.5 Q 49 483 49 483.5 Q 49 484 49 484.5 Q 49 485 48.5 486 Q 48 487 48 487.5 Q 48 488 48 488 Q 48 488 48 488 Q 48 488 48 488.5 Q 48 489 48 489.5 Q 48 490 47.5 490.5 Q 47 491 46.5 492.5 L 46 494');
    path_path_1769909941271.setAttribute('stroke', '#000000');
    path_path_1769909941271.setAttribute('stroke-width', '3');
    path_path_1769909941271.setAttribute('fill', 'none');
    path_path_1769909941271.setAttribute('stroke-linecap', 'round');
    path_path_1769909941271.setAttribute('stroke-linejoin', 'round');
    
    path_1769909941271.appendChild(path_path_1769909941271);
    path_1769909941271_container.appendChild(path_1769909941271);
    container.appendChild(path_1769909941271_container);
    
    // Animate circle_1
    tl.to('#element_1769909902000', {
        duration: 1.00,
        left: '1086.00px',
        top: '489.00px',
        scaleX: 1.00,
        scaleY: 1.00,
        rotation: 0.00,
        opacity: 1.00,
        ease: 'none'
    }, 0.00);
    
    tl.to('#element_1769909902000', {
        duration: 1.00,
        left: '14.00px',
        top: '10.00px',
        scaleX: 1.00,
        scaleY: 1.00,
        rotation: 0.00,
        opacity: 1.00,
        ease: 'none'
    }, 1.00);
    
    // Animate Drawing_1
    tl.to('#path_1769909941271_container', {
        duration: 1.00,
        left: '1065.00px',
        top: '12.00px',
        scaleX: 1.00,
        scaleY: 1.00,
        rotation: 0.00,
        opacity: 1.00,
        ease: 'none'
    }, 0.00);
    
    tl.to('#path_1769909941271_container', {
        duration: 1.00,
        left: '10.00px',
        top: '495.00px',
        scaleX: 1.00,
        scaleY: 1.00,
        rotation: 0.00,
        opacity: 1.00,
        ease: 'none'
    }, 1.00);
    
    // Play animation
    tl.play();
});
