// Generated Animation Code
// Using GSAP (GreenSock Animation Platform)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('animation-container');
    
    // Create timeline
    const tl = gsap.timeline({ 
        repeat: 0,
        defaults: { duration: 1, ease: "power1.inOut" }
    });
    
    // Create Group_1 (Group)
    const group_1770610290566 = document.createElement('div');
    group_1770610290566.id = 'group_1770610290566';
    group_1770610290566.style.position = 'absolute';
    group_1770610290566.style.transformOrigin = 'center center';
    container.appendChild(group_1770610290566);
    
    // Animate Group_1
    tl.to('#group_1770610290566', {
        duration: 1.70,
        left: '984.50px',
        top: '433.50px',
        scaleX: 1.00,
        scaleY: 1.00,
        rotation: 0.00,
        opacity: 1.00,
        ease: 'none'
    }, 0.00);
    
    // Play animation
    tl.play();
});
