<script>
  import { onMount } from 'svelte';

  let canvasEl = $state(null);

  onMount(() => {
    if (typeof window === 'undefined' || !canvasEl) return;

    const context = canvasEl.getContext('2d');
    if (!context) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const particleCount = prefersReducedMotion
      ? 34
      : window.innerWidth < 640
        ? 56
        : 92;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let particles = [];

    function createParticle() {
      const isBright = Math.random() > 0.72;
      const size = isBright
        ? Math.random() * 2.8 + 2.2
        : Math.random() * 1.9 + 0.8;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: size,
        alpha: isBright
          ? Math.random() * 0.24 + 0.22
          : Math.random() * 0.22 + 0.1,
        vx: (Math.random() - 0.5) * (isBright ? 0.08 : 0.14),
        vy: (Math.random() - 0.5) * (isBright ? 0.08 : 0.14),
        hue: Math.random() > 0.82 ? 46 : 216,
        bright: isBright,
      };
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);

      canvasEl.width = width * ratio;
      canvasEl.height = height * ratio;
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: particleCount }, createParticle);
    }

    function draw() {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        context.beginPath();
        context.fillStyle = particle.hue === 46
          ? `rgba(250, 204, 21, ${particle.alpha})`
          : `rgba(96, 165, 250, ${particle.alpha})`;
        context.shadowColor = particle.hue === 46
          ? 'rgba(250, 204, 21, 0.35)'
          : 'rgba(96, 165, 250, 0.28)';
        context.shadowBlur = particle.bright ? 22 : 14;
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      animationFrame = window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    draw();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.cancelAnimationFrame(animationFrame);
    };
  });
</script>

<canvas bind:this={canvasEl} class="particles-layer" aria-hidden="true"></canvas>

<style>
  .particles-layer {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 0.9;
  }
</style>
