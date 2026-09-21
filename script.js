const header = document.querySelector('[data-header]');
const observed = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

observed.forEach((element) => revealObserver.observe(element));

const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

const visual = document.querySelector('.hero-visual');
if (visual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const offset = Math.min(window.scrollY * 0.08, 42);
    visual.style.transform = `translateY(${offset}px)`;
  }, { passive: true });
}
