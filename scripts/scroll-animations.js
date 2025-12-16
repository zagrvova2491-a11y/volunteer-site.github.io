class ScrollAnimations {
    constructor() {
        this.init();
    }

    init() {
        this.setupScrollProgress();
        this.setupIntersectionObserver();
        this.setupScrollTriggers();
    }

    setupScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.innerHTML = '<div class="scroll-progress-bar"></div>';
        document.body.appendChild(progressBar);

        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            document.querySelector('.scroll-progress-bar').style.width = scrolled + '%';
        });
    }

    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    
                    // Добавляем класс для анимации
                    element.classList.add('aos-animate');
                    
                    // Анимация для текста
                    if (element.classList.contains('reveal-text')) {
                        setTimeout(() => {
                            element.style.opacity = '1';
                        }, element.dataset.delay || 0);
                    }
                    
                    // Анимация для статистики
                    if (element.classList.contains('stat-number')) {
                        this.animateCounter(element);
                    }
                }
            });
        }, observerOptions);

        // Наблюдаем за всеми элементами с data-aos
        document.querySelectorAll('[data-aos]').forEach(el => {
            observer.observe(el);
        });

        // Наблюдаем за reveal-текстом
        document.querySelectorAll('.reveal-text').forEach(el => {
            observer.observe(el);
        });
    }

    animateCounter(element) {
        const target = parseInt(element.textContent.replace(/[^0-9]/g, ''));
        const suffix = element.textContent.replace(/[0-9]/g, '');
        const duration = 2000;
        const step = target / (duration / 16); // 60fps
        
        let current = 0;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current) + suffix;
        }, 16);
    }

    setupParallax() {
        const parallaxElements = document.querySelectorAll('.story-image-container, .achievement-item');
        
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach((el, index) => {
                const rate = scrolled * 0.5;
                el.style.transform = `translateY(${rate}px)`;
            });
        });
    }

    setupScrollTriggers() {
        // Анимация при скролле к определенным секциям
        const sections = document.querySelectorAll('.story-module, .achievements-container');
        
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const section = entry.target;
                    
                    // Добавляем анимацию для элементов внутри
                    const items = section.querySelectorAll('.story-stat, .achievement-item');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, index * 200);
                    });
                }
            });
        }, { threshold: 0.3 });

        sections.forEach(section => {
            sectionObserver.observe(section);
            
            // Изначально скрываем элементы
            const items = section.querySelectorAll('.story-stat, .achievement-item');
            items.forEach(item => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                item.style.transition = 'all 0.5s ease';
            });
            
            const images = section.querySelectorAll('.story-image');
            images.forEach(img => {
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
                img.style.transition = 'all 1s ease';
            });
        });
    }

    // Эффект печатной машинки для заголовков
    typewriterEffect(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';
        
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.scrollAnimations = new ScrollAnimations();
    
    // Добавляем обработчики для кнопок CTA
    document.getElementById('joinCommunityBtn')?.addEventListener('click', () => {
        document.getElementById('chooseEventBtn')?.click();
    });
    
    document.getElementById('learnMoreBtn')?.addEventListener('click', () => {
        // Открываем модальное окно с видео
        const videoModal = document.createElement('div');
        videoModal.className = 'modal show';
        videoModal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h3>Видео о проекте Eco-Connect</h3>
                <div class="video-container" style="margin-top: 1rem;">
                    <iframe width="100%" height="400" 
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ" 
                            frameborder="0" 
                            allowfullscreen
                            style="border-radius: 15px;">
                    </iframe>
                </div>
            </div>
        `;
        document.body.appendChild(videoModal);
    });
    
    // Плавная прокрутка для всех якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});