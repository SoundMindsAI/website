document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Form submission handling
    const contactForm = document.querySelector('.contact-form');
    
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Basic form validation
        const name = this.querySelector('input[type="text"]');
        const email = this.querySelector('input[type="email"]');
        const message = this.querySelector('textarea');
        
        if (!name.value || !email.value || !message.value) {
            alert('Please fill out all fields');
            return;
        }
        
        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            alert('Please enter a valid email address');
            return;
        }

        // Disable submit button and show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        try {
            const response = await fetch('http://localhost:3000/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.value,
                    email: email.value,
                    message: message.value
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('Thank you for your message! We will get back to you soon.');
                this.reset();
            } else {
                throw new Error(data.error || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Sorry, there was an error sending your message. Please try again later.');
        } finally {
            // Re-enable submit button and restore original text
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });

    // Navigation menu toggle for mobile
    const navToggle = document.createElement('div');
    navToggle.classList.add('nav-toggle');
    navToggle.innerHTML = '☰';
    
    const nav = document.querySelector('nav ul');
    
    navToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
    
    // Only add mobile menu toggle on smaller screens
    if (window.innerWidth <= 768) {
        document.querySelector('nav').insertBefore(navToggle, nav);
    }

    // Hero Image Rotation
    let currentHero = 1;
    const totalHeroes = 3;

    function switchHero() {
        // Remove active class from current hero
        const currentHeroElement = document.getElementById(`hero-${currentHero}`);
        currentHeroElement.style.opacity = '0';
        
        setTimeout(() => {
            // Hide current hero
            currentHeroElement.style.display = 'none';
            
            // Update to next hero
            currentHero = (currentHero % totalHeroes) + 1;
            
            // Show new hero
            const nextHeroElement = document.getElementById(`hero-${currentHero}`);
            nextHeroElement.style.display = 'block';
            
            // Trigger reflow
            nextHeroElement.offsetHeight;
            
            // Fade in new hero
            nextHeroElement.style.opacity = '1';
        }, 1000); // Match this with CSS transition duration
    }

    // Switch hero every 8 seconds
    setInterval(switchHero, 8000);

    // Initialize first hero
    document.getElementById('hero-1').style.opacity = '1';
    document.getElementById('hero-1').style.display = 'block';

    // Tech image rotation
    const techImages = [
        { src: 'tech-1.svg', title: 'Neural Network AI' },
        { src: 'tech-2.svg', title: 'AI Analytics Dashboard' },
        { src: 'tech-3.svg', title: 'Cloud Infrastructure' }
    ];
    let currentTechIndex = 0;
    
    function rotateTechImage() {
        const techObject = document.querySelector('.tech-visualization');
        const techTitle = document.querySelector('.tech-title');
        if (techObject && techTitle) {
            currentTechIndex = (currentTechIndex + 1) % techImages.length;
            techObject.data = techImages[currentTechIndex].src;
            techTitle.textContent = techImages[currentTechIndex].title;
            
            // Add fade effect
            techTitle.style.opacity = '0';
            setTimeout(() => {
                techTitle.style.opacity = '1';
            }, 100);
        }
    }

    // Create and insert tech title element
    const techContainer = document.querySelector('.tech-image');
    if (techContainer) {
        const techTitle = document.createElement('h3');
        techTitle.className = 'tech-title';
        techTitle.textContent = techImages[0].title;
        techTitle.style.textAlign = 'center';
        techTitle.style.marginBottom = '20px';
        techTitle.style.color = '#4169E1';
        techTitle.style.transition = 'opacity 0.3s ease';
        techContainer.insertBefore(techTitle, techContainer.firstChild);
    }

    // Rotate tech image every 5 seconds
    setInterval(rotateTechImage, 5000);

    // Scroll-activated animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Add animation to sections
    document.querySelectorAll('.hero, .solutions, .technology, .contact').forEach(section => {
        observer.observe(section);
    });
});
