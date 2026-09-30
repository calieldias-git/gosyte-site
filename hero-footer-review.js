(() => {
  const vertexSource = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}`;
  const fragmentSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    float grain(vec2 p){
      vec3 p3=fract(vec3(p.xyx)*.1031);
      p3+=dot(p3,p3.yzx+33.33);
      return fract((p3.x+p3.y)*p3.z);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution.xy;
      vec2 p=(gl_FragCoord.xy-.5*u_resolution.xy)/min(u_resolution.x,u_resolution.y);
      float t=u_time*.86;
      vec2 c1=vec2(sin(t*.21+1.3),cos(t*.17+.4))*.44;
      vec2 c2=vec2(sin(t*.281+3.7),cos(t*.263+1.7))*.48;
      vec2 c3=vec2(sin(t*.352+6.1),cos(t*.356+3.4))*.40;
      float w1=exp(-dot(p-c1,p-c1)*6.0);
      float w2=exp(-dot(p-c2,p-c2)*6.0);
      float w3=exp(-dot(p-c3,p-c3)*6.0);
      vec3 col=vec3(.006)*.15+vec3(.64)*w1+vec3(.40)*w2+vec3(.22)*w3;
      col/= .15+w1+w2+w3;
      col=pow(col,vec3(1.35));
      col+=(grain(gl_FragCoord.xy+vec2(1453.0*17.0,1453.0*31.0))-.5)*.018;
      gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
    }`;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visibleCanvases = new Map();
  let pageVisible = document.visibilityState === 'visible';

  function attachShader(section) {
    let canvas = section.querySelector(':scope > .section-shader');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'section-shader';
      canvas.setAttribute('aria-hidden', 'true');
      section.prepend(canvas);
    }
    if (!(canvas instanceof HTMLCanvasElement)) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }

    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    let inView = false;
    let frame = 0;
    const startedAt = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelScale = Math.min(1, Math.sqrt(1_400_000 / Math.max(1, bounds.width * bounds.height * dpr * dpr)));
      const width = Math.max(1, Math.round(bounds.width * dpr * pixelScale));
      const height = Math.max(1, Math.round(bounds.height * dpr * pixelScale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (now) => {
      frame = 0;
      if (!inView || !pageVisible) return;
      resize();
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reduceMotion.matches ? 0 : (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion.matches) frame = requestAnimationFrame(draw);
    };
    const requestDraw = () => {
      if (frame === 0 && inView && pageVisible) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      if (inView) requestDraw();
      else if (frame) { cancelAnimationFrame(frame); frame = 0; }
    });
    observer.observe(canvas);
    visibleCanvases.set(canvas, {
      requestDraw,
      observer,
      stop: () => { if (frame) { cancelAnimationFrame(frame); frame = 0; } },
    });
  }

  document.querySelectorAll('.section-dark').forEach(attachShader);

  const onVisibility = () => {
    pageVisible = document.visibilityState === 'visible';
    visibleCanvases.forEach(({requestDraw, stop}) => {
      if (pageVisible) requestDraw();
      else stop();
    });
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', () => {
    visibleCanvases.forEach(({requestDraw}) => requestDraw());
  }, { passive: true });
  reduceMotion.addEventListener?.('change', () => {
    visibleCanvases.forEach(({requestDraw}) => requestDraw());
  });

  const drawing = document.querySelector('.brand-draw');
  if (drawing && !reduceMotion.matches) {
    const beginWriting = () => drawing.classList.add('is-ready');
    if (document.fonts?.ready) document.fonts.ready.then(beginWriting);
    else beginWriting();
  }
})();

