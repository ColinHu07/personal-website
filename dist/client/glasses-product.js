import * as THREE from "./assets/vendor/three.module.min.js";

const canvas = document.querySelector(".glasses-product-canvas");
const viewport = document.querySelector("#glasses .viewport");
const contactViewport = document.querySelector("#contact .contact-viewport");
const lensSocialsSurface = document.querySelector("#contact .lens-socials-surface");

if (canvas && viewport) {
  const phonePerformance = window.matchMedia("(max-width: 900px), (pointer: coarse), (orientation: landscape) and (max-height: 500px)").matches;
  const safariPerformance = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
  const devicePixelRatio = window.devicePixelRatio || 1;
  // Safari keeps the cheaper material/compositor profile, but a Retina desktop
  // must not inherit the sub-CSS-pixel phone buffer that made edges visibly
  // blocky. Phones render at one CSS pixel; desktops keep a crisp 1.5x cap.
  const leanPerformance = phonePerformance || safariPerformance;
  const renderPixelRatio = phonePerformance ? 1 : 1.5;
  // Safari 26.2 composites WebGL on the main thread while a sticky ancestor is
  // scrolling. Keeping that path near one physical megapixel costs half the
  // fill-rate of the old 1.9 MP buffer while remaining CSS-pixel sharp.
  const renderPixelBudget = phonePerformance ? 1250000 : safariPerformance ? 1150000 : 3200000;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0f12);
  scene.fog = leanPerformance ? null : new THREE.FogExp2(0x0c0f12, 0.021);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !leanPerformance,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, renderPixelRatio));
  renderer.shadowMap.enabled = !leanPerformance;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = leanPerformance ? 1.5 : 1.3;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.025, 80);
  scene.add(camera);

  const product = new THREE.Group();
  product.position.y = 0.25;
  scene.add(product);

  // Clearcoat and transmission look excellent at desktop resolution, but they
  // multiply fragment-shader work on a phone. Keep the same colors, opacity,
  // metalness, and roughness with a cheaper standard-lighting material there.
  const surfaceMaterial = (options) => {
    if (!leanPerformance) return new THREE.MeshPhysicalMaterial(options);
    const mobileOptions = { ...options };
    [
      "clearcoat",
      "clearcoatRoughness",
      "ior",
      "reflectivity",
      "thickness",
      "transmission",
    ].forEach((property) => delete mobileOptions[property]);
    return new THREE.MeshStandardMaterial(mobileOptions);
  };
  const detail = (desktop, lean) => leanPerformance ? lean : desktop;

  const frameMaterial = surfaceMaterial({
    color: leanPerformance ? 0x252a30 : 0x121519,
    metalness: 0.08,
    roughness: 0.13,
    clearcoat: 1,
    clearcoatRoughness: 0.055,
    reflectivity: 0.92,
    side: THREE.DoubleSide,
  });
  const innerAcetateMaterial = surfaceMaterial({
    color: leanPerformance ? 0x2b3138 : 0x1b2026,
    metalness: 0.12,
    roughness: 0.2,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });
  const lensMaterial = surfaceMaterial({
    color: leanPerformance ? 0x304854 : 0x26353d,
    metalness: 0.05,
    roughness: 0.12,
    transmission: 0.34,
    transparent: true,
    opacity: 0.74,
    thickness: 0.08,
    ior: 1.48,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
  });
  const lensEdgeMaterial = surfaceMaterial({
    color: leanPerformance ? 0x425763 : 0x31424a,
    metalness: 0.18,
    roughness: 0.18,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0xaeb4b9,
    metalness: 0.92,
    roughness: 0.23,
  });
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x252a2e,
    metalness: 0.82,
    roughness: 0.27,
  });
  const opticMaterial = surfaceMaterial({
    color: 0x071d28,
    emissive: 0x123d54,
    emissiveIntensity: 0.28,
    metalness: 0.35,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  const waveguideMaterial = surfaceMaterial({
    color: 0x8ddcf3,
    emissive: 0x3b9cb8,
    emissiveIntensity: 0.12,
    transparent: true,
    opacity: 0,
    metalness: 0.08,
    roughness: 0.04,
    transmission: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const pcbMaterial = new THREE.MeshStandardMaterial({
    color: 0x15382f,
    metalness: 0.28,
    roughness: 0.43,
  });
  const siliconMaterial = new THREE.MeshStandardMaterial({
    color: 0x11171c,
    metalness: 0.48,
    roughness: 0.31,
  });
  const batteryMaterial = surfaceMaterial({
    color: 0x5f6871,
    metalness: 0.62,
    roughness: 0.28,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
  });
  const copperMaterial = new THREE.MeshStandardMaterial({
    color: 0xc96f35,
    metalness: 0.74,
    roughness: 0.3,
  });
  const flexMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a4d1e,
    emissive: 0x351407,
    emissiveIntensity: 0.18,
    metalness: 0.48,
    roughness: 0.34,
  });

  const parts = [];
  const internalParts = [];
  const addPart = (group, explodeOffset) => {
    group.userData.basePosition = group.position.clone();
    group.userData.explodeOffset = explodeOffset;
    parts.push(group);
    product.add(group);
    return group;
  };
  const addInternalPart = (group, explodeOffset, explodeRotation = new THREE.Vector3()) => {
    group.userData.internalOnly = true;
    group.userData.baseRotation = group.rotation.clone();
    group.userData.explodeRotation = explodeRotation;
    internalParts.push(group);
    return addPart(group, explodeOffset);
  };

  const roundedRectShape = (width, height, radius) => {
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return shape;
  };

  const extrude = (shape, depth, bevel = 0.08, bevelSegments = 4) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: leanPerformance ? Math.min(bevelSegments, 2) : bevelSegments,
      curveSegments: leanPerformance ? 20 : 64,
      steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    geometry.computeVertexNormals();
    return geometry;
  };

  const wrapGeometry = (geometry, edgeDepth = 0.22) => {
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const normalizedX = Math.min(1, Math.abs(x) / 4.9);
      positions.setZ(index, positions.getZ(index) - edgeDepth * normalizedX * normalizedX);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  };

  const traceInnerLens = (path, side, reverse = false) => {
    if (!reverse) {
      path.moveTo(side * 1.1, 0.98);
      path.bezierCurveTo(side * 1.65, 1.24, side * 3.5, 1.24, side * 4.1, 1.06);
      path.bezierCurveTo(side * 4.18, 0.45, side * 4.02, -0.58, side * 3.65, -1.06);
      path.bezierCurveTo(side * 3.05, -1.4, side * 1.85, -1.42, side * 1.48, -1.18);
      path.bezierCurveTo(side * 1.22, -0.55, side * 1.02, 0.3, side * 1.1, 0.98);
    } else {
      path.moveTo(side * 1.1, 0.98);
      path.bezierCurveTo(side * 1.02, 0.3, side * 1.22, -0.55, side * 1.48, -1.18);
      path.bezierCurveTo(side * 1.85, -1.42, side * 3.05, -1.4, side * 3.65, -1.06);
      path.bezierCurveTo(side * 4.02, -0.58, side * 4.18, 0.45, side * 4.1, 1.06);
      path.bezierCurveTo(side * 3.5, 1.24, side * 1.65, 1.24, side * 1.1, 0.98);
    }
  };

  const makeFrameGeometry = () => {
    const frame = new THREE.Shape();
    frame.moveTo(0, 1.22);
    frame.bezierCurveTo(0.26, 1.22, 0.5, 1.35, 0.72, 1.38);
    frame.bezierCurveTo(1.45, 1.62, 3.85, 1.62, 4.8, 1.4);
    frame.bezierCurveTo(4.92, 0.58, 4.76, -0.65, 4.25, -1.34);
    frame.bezierCurveTo(3.25, -1.67, 1.75, -1.7, 1.18, -1.38);
    frame.bezierCurveTo(0.96, -1.24, 0.78, -0.92, 0.72, -0.72);
    frame.bezierCurveTo(0.46, -0.1, 0.3, 0.4, 0, 0.4);
    frame.bezierCurveTo(-0.3, 0.4, -0.46, -0.1, -0.72, -0.72);
    frame.bezierCurveTo(-0.78, -0.92, -0.96, -1.24, -1.18, -1.38);
    frame.bezierCurveTo(-1.75, -1.7, -3.25, -1.67, -4.25, -1.34);
    frame.bezierCurveTo(-4.76, -0.65, -4.92, 0.58, -4.8, 1.4);
    frame.bezierCurveTo(-3.85, 1.62, -1.45, 1.62, -0.72, 1.38);
    frame.bezierCurveTo(-0.5, 1.35, -0.26, 1.22, 0, 1.22);
    frame.closePath();

    [-1, 1].forEach((side) => {
      const opening = new THREE.Path();
      traceInnerLens(opening, side, side === 1);
      frame.holes.push(opening);
    });
    return wrapGeometry(extrude(frame, 0.16, 0.048, 18), 0.24);
  };

  const makeLensGeometry = (side, depth = 0.06) => {
    const lens = new THREE.Shape();
    traceInnerLens(lens, side, false);
    const geometry = wrapGeometry(extrude(lens, depth, 0.012, 5), 0.24);
    const positions = geometry.attributes.position;
    const centerX = side * 2.62;
    for (let index = 0; index < positions.count; index += 1) {
      const x = (positions.getX(index) - centerX) / 1.65;
      const y = (positions.getY(index) + 0.08) / 1.35;
      const bulge = Math.max(0, 1 - x * x - y * y) * 0.045;
      positions.setZ(index, positions.getZ(index) + bulge);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  };

  // A smooth loft follows the real product's single molded temple shell. The
  // cross-section tapers continuously toward the adjustable ear hook instead
  // of exposing the old stack of rectangular extrusions during the orbit.
  const makeTempleGeometry = (side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0.06),
      new THREE.Vector3(-side * 0.03, 0, -1),
      new THREE.Vector3(-side * 0.1, -0.05, -2.8),
      new THREE.Vector3(-side * 0.18, -0.12, -4.8),
      new THREE.Vector3(-side * 0.25, -0.35, -6.3),
      new THREE.Vector3(-side * 0.28, -0.85, -7.4),
      new THREE.Vector3(-side * 0.26, -1.3, -7.85),
    ]);
    curve.curveType = "centripetal";

    const lengthSegments = 72;
    const radialSegments = 20;
    const positions = [];
    const uvs = [];
    const indices = [];
    const center = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const widthAxis = new THREE.Vector3();
    const heightAxis = new THREE.Vector3();
    const vertex = new THREE.Vector3();

    const sampleProfile = (t) => {
      const stops = [
        [0, 0.58, 1.02],
        [0.1, 0.5, 0.88],
        [0.48, 0.34, 0.57],
        [0.72, 0.29, 0.48],
        [1, 0.23, 0.38],
      ];
      for (let i = 1; i < stops.length; i += 1) {
        if (t <= stops[i][0]) {
          const previous = stops[i - 1];
          const next = stops[i];
          const amount = (t - previous[0]) / (next[0] - previous[0]);
          return {
            width: previous[1] + (next[1] - previous[1]) * amount,
            height: previous[2] + (next[2] - previous[2]) * amount,
          };
        }
      }
      return { width: stops.at(-1)[1], height: stops.at(-1)[2] };
    };

    for (let i = 0; i <= lengthSegments; i += 1) {
      const t = i / lengthSegments;
      curve.getPointAt(t, center);
      curve.getTangentAt(t, tangent).normalize();
      widthAxis.set(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
      heightAxis.crossVectors(widthAxis, tangent).normalize();
      const profile = sampleProfile(t);

      for (let j = 0; j < radialSegments; j += 1) {
        const angle = (j / radialSegments) * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        // Blend an ellipse with a very mild superellipse so the temple keeps
        // its broad Meta-style face without forming hard shoulder lines.
        const roundedCosine = Math.sign(cosine) * Math.sqrt(Math.abs(cosine));
        const roundedSine = Math.sign(sine) * Math.sqrt(Math.abs(sine));
        const crossX = (cosine * 0.62 + roundedCosine * 0.38) * profile.width * 0.5;
        const crossY = (sine * 0.62 + roundedSine * 0.38) * profile.height * 0.5;
        vertex.copy(center)
          .addScaledVector(widthAxis, crossX)
          .addScaledVector(heightAxis, crossY);
        positions.push(vertex.x, vertex.y, vertex.z);
        uvs.push(t, j / radialSegments);
      }
    }

    for (let i = 0; i < lengthSegments; i += 1) {
      for (let j = 0; j < radialSegments; j += 1) {
        const nextJ = (j + 1) % radialSegments;
        const a = i * radialSegments + j;
        const b = i * radialSegments + nextJ;
        const c = (i + 1) * radialSegments + nextJ;
        const d = (i + 1) * radialSegments + j;
        indices.push(a, b, d, b, c, d);
      }
    }

    const startCenterIndex = positions.length / 3;
    curve.getPointAt(0, center);
    positions.push(center.x, center.y, center.z);
    uvs.push(0.5, 0.5);
    const endCenterIndex = positions.length / 3;
    curve.getPointAt(1, center);
    positions.push(center.x, center.y, center.z);
    uvs.push(0.5, 0.5);
    const endRingStart = lengthSegments * radialSegments;
    for (let j = 0; j < radialSegments; j += 1) {
      const nextJ = (j + 1) % radialSegments;
      indices.push(startCenterIndex, nextJ, j);
      indices.push(endCenterIndex, endRingStart + j, endRingStart + nextJ);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };

  const frontFrame = new THREE.Group();
  const unifiedFrame = new THREE.Mesh(makeFrameGeometry(), frameMaterial);
  unifiedFrame.castShadow = true;
  unifiedFrame.receiveShadow = true;
  frontFrame.add(unifiedFrame);
  addPart(frontFrame, new THREE.Vector3(0, 0, 0.34));

  // A second, recessed acetate carrier gives the brow, bridge and lens wells
  // real rearward volume. It remains part of the clean assembled silhouette,
  // then separates as the structural chassis during the teardown.
  const innerCarrier = new THREE.Group();
  const carrierShell = new THREE.Mesh(makeFrameGeometry(), innerAcetateMaterial);
  carrierShell.scale.set(0.982, 0.976, 0.58);
  carrierShell.position.z = -0.14;
  carrierShell.castShadow = true;
  carrierShell.receiveShadow = true;
  innerCarrier.add(carrierShell);
  addInternalPart(innerCarrier, new THREE.Vector3(0, -0.03, -0.82));

  const makeLensPart = (side) => {
    const group = new THREE.Group();
    const lens = new THREE.Mesh(makeLensGeometry(side), lensMaterial);
    lens.position.z = 0.045;
    lens.castShadow = true;
    group.add(lens);
    const edge = new THREE.Mesh(makeLensGeometry(side, 0.025), lensEdgeMaterial);
    edge.position.z = -0.018;
    group.add(edge);
    const rearSurface = new THREE.Mesh(makeLensGeometry(side, 0.012), lensEdgeMaterial);
    rearSurface.position.z = -0.052;
    rearSurface.material = lensEdgeMaterial;
    group.add(rearSurface);
    return group;
  };
  const leftLens = addPart(makeLensPart(-1), new THREE.Vector3(-0.12, 0.04, 1.52));
  const rightLens = addPart(makeLensPart(1), new THREE.Vector3(0.12, -0.04, 1.68));

  // The wearer display lives in the negative-X lens. Sample the same curve
  // used to build that physical lens so the Socials mask can be projected from
  // the live Three.js pose instead of approximated by a fixed screen polygon.
  const lensPortalShape = new THREE.Shape();
  traceInnerLens(lensPortalShape, -1, false);
  const lensPortalPoints = lensPortalShape.getSpacedPoints(28);
  if (
    lensPortalPoints.length > 1 &&
    lensPortalPoints[0].distanceTo(lensPortalPoints[lensPortalPoints.length - 1]) < 0.001
  ) {
    lensPortalPoints.pop();
  }
  const lensPortalDepth = (x) =>
    -0.06 - 0.24 * Math.pow(Math.min(1, Math.abs(x) / 4.9), 2);
  const lensPortalOutline = lensPortalPoints.map(
    (point) => new THREE.Vector3(point.x, point.y, lensPortalDepth(point.x))
  );
  const lensPortalTopEdge = [
    new THREE.Vector3(-1.1, 0.98, lensPortalDepth(-1.1)),
    new THREE.Vector3(-4.1, 1.06, lensPortalDepth(-4.1)),
  ];

  // Render the actual asymmetric Meta symbol as a crisp metallic inlay. The
  // vector paths are drawn into a transparent canvas, so the mark remains
  // code-native and sharp without using a screenshot or footage texture.
  const metaLogoCanvas = document.createElement("canvas");
  metaLogoCanvas.width = 576;
  metaLogoCanvas.height = 382;
  const metaLogoContext = metaLogoCanvas.getContext("2d");
  metaLogoContext.clearRect(0, 0, metaLogoCanvas.width, metaLogoCanvas.height);
  metaLogoContext.scale(2, 2);
  metaLogoContext.fillStyle = "#f3f5f6";
  [
    "m31.06,125.96c0,10.98 2.41,19.41 5.56,24.51 4.13,6.68 10.29,9.51 16.57,9.51 8.1,0 15.51-2.01 29.79-21.76 11.44-15.83 24.92-38.05 33.99-51.98l15.36-23.6c10.67-16.39 23.02-34.61 37.18-46.96 11.56-10.08 24.03-15.68 36.58-15.68 21.07,0 41.14,12.21 56.5,35.11 16.81,25.08 24.97,56.67 24.97,89.27 0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75l0-31.02c17.63,0 22.03-16.2 22.03-34.74 0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16.05c-18.2,32.27-22.81,39.62-31.91,51.75-15.95,21.24-29.57,29.29-47.5,29.29-21.27,0-34.72-9.21-43.05-23.09-6.8-11.31-10.14-26.15-10.14-43.06z",
    "m24.49,37.3c14.24-21.95 34.79-37.3 58.36-37.3 13.65,0 27.22,4.04 41.39,15.61 15.5,12.65 32.02,33.48 52.63,67.81l7.39,12.32c17.84,29.72 27.99,45.01 33.93,52.22 7.64,9.26 12.99,12.02 19.94,12.02 17.63,0 22.03-16.2 22.03-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87-6.28,10.88-18.52,21.75-39.11,21.75-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71l-25.79-43.08c-12.94-21.62-24.81-37.74-31.68-45.04-7.39-7.85-16.89-17.33-32.05-17.33-12.27,0-22.69,8.61-31.41,21.78z",
    "m82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78-12.33,18.61-19.88,46.33-19.88,72.95 0,10.98 2.41,19.41 5.56,24.51l-26.48,17.44c-6.8-11.31-10.14-26.15-10.14-43.06 0-30.75 8.44-62.8 24.49-87.55 14.24-21.95 34.79-37.3 58.36-37.3z",
  ].forEach((path) => metaLogoContext.fill(new Path2D(path)));
  const metaLogoTexture = new THREE.CanvasTexture(metaLogoCanvas);
  metaLogoTexture.colorSpace = THREE.SRGBColorSpace;
  metaLogoTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const metaLogoMaterial = new THREE.MeshStandardMaterial({
    map: metaLogoTexture,
    transparent: true,
    alphaTest: 0.22,
    depthWrite: false,
    metalness: 0.88,
    roughness: 0.2,
    side: THREE.DoubleSide,
  });

  const makeTemple = (side) => {
    const group = new THREE.Group();
    group.position.set(side * 4.58, 0.75, -0.1);
    group.rotation.y = side * 0.035;

    const shell = new THREE.Mesh(makeTempleGeometry(side), frameMaterial);
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    const metaMark = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.312), metaLogoMaterial);
    metaMark.position.set(side * 0.322, 0.17, -0.34);
    metaMark.rotation.y = side * Math.PI * 0.5;
    metaMark.renderOrder = 4;
    group.add(metaMark);

    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.026, detail(18, 10), detail(12, 8)), darkMetalMaterial);
    mic.position.set(side * 0.175, -0.12, -2.72);
    group.add(mic);
    return group;
  };
  const leftTemple = addPart(makeTemple(-1), new THREE.Vector3(-0.62, 0.12, -2.65));
  const rightTemple = addPart(makeTemple(1), new THREE.Vector3(0.62, -0.12, -2.65));

  const makeHinge = (side) => {
    const group = new THREE.Group();
    group.position.set(side * 4.56, 0.72, -0.18);
    const block = new THREE.Mesh(extrude(roundedRectShape(0.3, 0.34, 0.07), 0.3, 0.025, 7), darkMetalMaterial);
    block.position.z = -0.15;
    block.castShadow = true;
    group.add(block);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.54, detail(24, 12)), metalMaterial);
    pin.rotation.z = Math.PI / 2;
    pin.position.z = 0.04;
    group.add(pin);
    return group;
  };
  addPart(makeHinge(-1), new THREE.Vector3(-0.48, 0.1, -1.12));
  addPart(makeHinge(1), new THREE.Vector3(0.48, -0.1, -1.12));

  const cameraModule = new THREE.Group();
  cameraModule.position.set(-4.4, 0.84, 0.14);
  const cameraHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.075, detail(64, 20)), darkMetalMaterial);
  cameraHousing.rotation.x = Math.PI / 2;
  cameraHousing.castShadow = true;
  cameraModule.add(cameraHousing);
  const cameraBezel = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, detail(18, 8), detail(64, 24)), metalMaterial);
  cameraBezel.position.z = 0.058;
  cameraModule.add(cameraBezel);
  const cameraGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.028, detail(64, 20)), opticMaterial);
  cameraGlass.rotation.x = Math.PI / 2;
  cameraGlass.position.z = 0.072;
  cameraModule.add(cameraGlass);
  const cameraAperture = new THREE.Mesh(
    new THREE.CircleGeometry(0.064, detail(48, 18)),
    surfaceMaterial({
      color: 0x020609,
      emissive: 0x061924,
      emissiveIntensity: 0.22,
      metalness: 0.18,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    })
  );
  cameraAperture.position.z = 0.092;
  cameraModule.add(cameraAperture);
  const cameraGlint = new THREE.Mesh(new THREE.SphereGeometry(0.021, detail(20, 10), detail(12, 8)), new THREE.MeshBasicMaterial({ color: 0xcff5ff }));
  cameraGlint.position.set(-0.036, 0.044, 0.102);
  cameraModule.add(cameraGlint);
  const cameraSensorBody = new THREE.Mesh(
    extrude(roundedRectShape(0.38, 0.38, 0.1), 0.3, 0.025, 5),
    darkMetalMaterial
  );
  cameraSensorBody.position.z = -0.2;
  cameraModule.add(cameraSensorBody);
  addPart(cameraModule, new THREE.Vector3(-0.56, 0.34, 2.05));

  const statusLight = new THREE.Group();
  statusLight.position.set(4.4, 0.84, 0.155);
  const lightRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, detail(16, 8), detail(48, 20)), darkMetalMaterial);
  statusLight.add(lightRing);
  const lightGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.071, detail(48, 18)),
    surfaceMaterial({
      color: 0xc9c8bb,
      emissive: 0x746f58,
      emissiveIntensity: 0.12,
      roughness: 0.34,
      clearcoat: 0.65,
      clearcoatRoughness: 0.26,
    })
  );
  lightGlass.position.z = 0.012;
  statusLight.add(lightGlass);
  addPart(statusLight, new THREE.Vector3(0.56, -0.24, 1.9));

  const displayEngine = new THREE.Group();
  // The display hardware lives on the wearer's right side. In an exterior
  // front view this is the lens on screen-left, so all optical geometry and
  // the dive target share negative local X.
  displayEngine.position.set(-3.72, 0.92, -0.45);
  const displayBody = new THREE.Mesh(extrude(roundedRectShape(0.72, 0.48, 0.13), 0.72, 0.06, 4), darkMetalMaterial);
  displayBody.castShadow = true;
  displayEngine.add(displayBody);
  const displayHeatSpreader = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.045), copperMaterial);
  displayHeatSpreader.position.z = -0.39;
  displayEngine.add(displayHeatSpreader);
  const displayChip = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), siliconMaterial);
  displayChip.position.set(-0.12, 0, -0.44);
  displayEngine.add(displayChip);
  const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.055, detail(28, 12)), opticMaterial);
  projector.rotation.x = Math.PI / 2;
  projector.position.set(0.18, 0, 0.39);
  displayEngine.add(projector);
  [0.31, 0.39, 0.47].forEach((z, index) => {
    const optic = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092 - index * 0.012, 0.092 - index * 0.012, 0.026, detail(28, 12)),
      index === 1 ? waveguideMaterial : opticMaterial
    );
    optic.rotation.x = Math.PI / 2;
    optic.position.set(0.18, 0, z);
    displayEngine.add(optic);
  });
  addInternalPart(displayEngine, new THREE.Vector3(-1.08, 1.08, -1.88), new THREE.Vector3(0.08, -0.08, 0.04));

  const waveguide = new THREE.Group();
  const waveguideLens = new THREE.Mesh(makeLensGeometry(-1, 0.022), waveguideMaterial);
  waveguideLens.position.z = 0.19;
  waveguide.add(waveguideLens);
  const combiner = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.5, detail(48, 20)), waveguideMaterial);
  combiner.position.set(-2.75, 0.12, 0.235);
  combiner.scale.y = 0.72;
  waveguide.add(combiner);
  for (let index = 0; index < 11; index += 1) {
    const grating = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.012, 0.008), waveguideMaterial);
    grating.position.set(-2.75, -0.18 + index * 0.055, 0.252);
    grating.rotation.z = -0.22;
    waveguide.add(grating);
  }
  addInternalPart(waveguide, new THREE.Vector3(-0.24, -0.5, 2.18), new THREE.Vector3(-0.04, 0.04, -0.02));

  const makeInternalBoard = () => {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 1.62), pcbMaterial);
    board.castShadow = true;
    group.add(board);
    [
      [0.055, 0.12, -0.46, 0.22, 0.24, 0.34, siliconMaterial],
      [0.055, -0.14, 0.1, 0.2, 0.18, 0.42, siliconMaterial],
      [0.058, 0.1, 0.52, 0.24, 0.2, 0.32, darkMetalMaterial],
    ].forEach(([x, y, z, width, height, depth, material]) => {
      const component = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      component.position.set(x, y, z);
      group.add(component);
    });
    const shieldingCan = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.42, 0.46), metalMaterial);
    shieldingCan.position.set(-0.055, 0.02, -0.2);
    group.add(shieldingCan);
    return group;
  };

  // Compute and storage occupy the display-side temple. Individual package,
  // memory and RF shield volumes keep the board readable as a real assembly.
  const computeBoard = makeInternalBoard();
  computeBoard.position.set(-4.45, 0.63, -1.55);
  addInternalPart(computeBoard, new THREE.Vector3(-1.72, 0.84, -0.62), new THREE.Vector3(0.03, 0.12, -0.05));

  // The opposite temple carries short, segmented pouch cells rather than the
  // old exterior battery bar. Every cell disappears inside the shell when the
  // glasses reassemble.
  const batteryPack = new THREE.Group();
  batteryPack.position.set(4.45, 0.6, -1.55);
  [-0.64, 0, 0.64].forEach((z, index) => {
    const cell = new THREE.Mesh(
      new THREE.BoxGeometry(0.34 - index * 0.015, 0.5 - index * 0.018, 0.54),
      batteryMaterial
    );
    cell.position.z = z;
    cell.castShadow = true;
    batteryPack.add(cell);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.08), copperMaterial);
    tab.position.set(-0.05, 0.27, z + 0.18);
    batteryPack.add(tab);
  });
  addInternalPart(batteryPack, new THREE.Vector3(1.76, -0.78, -0.72), new THREE.Vector3(-0.05, -0.12, 0.06));

  const makeSpeakerModule = (side) => {
    const group = new THREE.Group();
    group.position.set(side * 4.38, 0.18, -4.35);
    const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.13, detail(32, 16)), darkMetalMaterial);
    driver.rotation.z = Math.PI / 2;
    group.add(driver);
    const diaphragm = new THREE.Mesh(new THREE.CircleGeometry(0.175, detail(32, 16)), copperMaterial);
    diaphragm.rotation.y = side * Math.PI / 2;
    diaphragm.position.x = side * 0.072;
    group.add(diaphragm);
    const acousticPort = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, detail(12, 8), detail(36, 16)), metalMaterial);
    acousticPort.rotation.y = Math.PI / 2;
    acousticPort.position.x = side * 0.078;
    group.add(acousticPort);
    return group;
  };
  addInternalPart(makeSpeakerModule(-1), new THREE.Vector3(-1.4, -1.02, -0.88), new THREE.Vector3(0.08, 0, -0.08));
  addInternalPart(makeSpeakerModule(1), new THREE.Vector3(1.4, -0.92, -0.76), new THREE.Vector3(-0.08, 0, 0.08));

  const touchSensor = new THREE.Group();
  touchSensor.position.set(-4.78, 0.63, -2.45);
  const touchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.38, 1.36), copperMaterial);
  touchSensor.add(touchPlate);
  for (let index = -2; index <= 2; index += 1) {
    const trace = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 1.08), metalMaterial);
    trace.position.set(-0.018, index * 0.065, 0);
    touchSensor.add(trace);
  }
  addInternalPart(touchSensor, new THREE.Vector3(-2.1, 0.12, -1.06), new THREE.Vector3(0, 0.07, 0.02));

  const antennaArray = new THREE.Group();
  antennaArray.position.set(4.66, 0.48, -3.12);
  [-0.42, 0, 0.42].forEach((z, index) => {
    const antennaSegment = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.055, 0.32), copperMaterial);
    antennaSegment.position.set(0, index * 0.055 - 0.055, z);
    antennaArray.add(antennaSegment);
  });
  addInternalPart(antennaArray, new THREE.Vector3(2.08, 0.54, -1.14), new THREE.Vector3(0.04, -0.08, -0.04));

  const microphoneArray = new THREE.Group();
  [
    [-4.42, 0.28, -2.72],
    [4.42, 0.26, -2.74],
    [-3.9, 0.92, -0.48],
    [3.92, 0.9, -0.5],
  ].forEach(([x, y, z]) => {
    const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.075, detail(20, 10)), darkMetalMaterial);
    capsule.rotation.z = Math.PI / 2;
    capsule.position.set(x, y, z);
    microphoneArray.add(capsule);
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.025, detail(18, 10)), opticMaterial);
    port.rotation.y = Math.PI / 2;
    port.position.set(x - 0.042, y, z);
    microphoneArray.add(port);
  });
  addInternalPart(microphoneArray, new THREE.Vector3(0, 1.46, -0.24), new THREE.Vector3(0.03, 0, 0));

  const makeFlexCable = (side) => {
    const group = new THREE.Group();
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 4.18, 0.77, -0.38),
      new THREE.Vector3(side * 4.42, 0.68, -1.2),
      new THREE.Vector3(side * 4.43, 0.56, -2.45),
      new THREE.Vector3(side * 4.35, 0.2, -4.18),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(path, 56, 0.032, 8, false), flexMaterial);
    group.add(cable);
    [0.12, 0.88].forEach((t) => {
      const point = path.getPointAt(t);
      const connector = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.18), copperMaterial);
      connector.position.copy(point);
      group.add(connector);
    });
    return group;
  };
  addInternalPart(makeFlexCable(-1), new THREE.Vector3(-1.08, 0.7, -0.62), new THREE.Vector3(0.02, 0.03, -0.03));
  addInternalPart(makeFlexCable(1), new THREE.Vector3(1.04, 0.62, -0.56), new THREE.Vector3(-0.02, -0.03, 0.03));

  // Separate the image sensor and its carrier from the exterior camera glass,
  // so the camera reads as a real lens stack during the explosion.
  const cameraBoard = new THREE.Group();
  cameraBoard.position.set(-4.4, 0.84, -0.32);
  const sensorBoard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.055), pcbMaterial);
  cameraBoard.add(sensorBoard);
  const sensorDie = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.075), opticMaterial);
  sensorDie.position.z = 0.06;
  cameraBoard.add(sensorDie);
  const cameraShield = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.06), metalMaterial);
  cameraShield.position.z = -0.065;
  cameraBoard.add(cameraShield);
  addInternalPart(cameraBoard, new THREE.Vector3(-1.5, 1.02, 1.42), new THREE.Vector3(0.05, -0.04, 0.05));

  // A soft charcoal cyc keeps the black acetate readable at every orbit angle
  // without flattening the product into a gray silhouette.
  const backdropCanvas = document.createElement("canvas");
  backdropCanvas.width = 512;
  backdropCanvas.height = 512;
  const backdropContext = backdropCanvas.getContext("2d");
  const backdropGradient = backdropContext.createRadialGradient(256, 220, 18, 256, 220, 285);
  backdropGradient.addColorStop(0, "#303841");
  backdropGradient.addColorStop(0.42, "#1c2228");
  backdropGradient.addColorStop(0.74, "#111519");
  backdropGradient.addColorStop(1, "#0c0f12");
  backdropContext.fillStyle = backdropGradient;
  backdropContext.fillRect(0, 0, 512, 512);
  const backdropTexture = new THREE.CanvasTexture(backdropCanvas);
  backdropTexture.colorSpace = THREE.SRGBColorSpace;
  // Use the gradient as the renderer background instead of a finite plane.
  // The old plane's top and bottom edges were visible as thick horizontal
  // bands in portrait viewports because the mobile camera sits farther back.
  scene.background = backdropTexture;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.2, transparent: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.05;
  floor.position.z = -1.2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ambient = new THREE.HemisphereLight(0xb8cedc, 0x111318, leanPerformance ? 3.1 : 1.65);
  scene.add(ambient);

  const frontFill = new THREE.DirectionalLight(0xc8dbe7, leanPerformance ? 2.35 : 0.9);
  frontFill.position.set(0, 3.5, 9);
  scene.add(frontFill);

  const key = leanPerformance
    ? new THREE.DirectionalLight(0xffe7d6, 2.4)
    : new THREE.SpotLight(0xffe7d6, 190, 34, Math.PI / 4.6, 0.5, 1.35);
  key.position.set(-7.5, 8.5, 10.5);
  key.target.position.set(-0.8, 0.4, 0);
  key.castShadow = !leanPerformance;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0003;
  scene.add(key, key.target);

  const fill = new THREE.SpotLight(0x80cfff, 150, 30, Math.PI / 4, 0.62, 1.25);
  fill.position.set(8, 4.5, 7);
  fill.target.position.set(1.5, 0, -0.8);
  if (!leanPerformance) scene.add(fill, fill.target);

  const warmRim = new THREE.PointLight(0xff9c67, 85, 24, 1.7);
  warmRim.position.set(-6, -0.2, -6);

  const coolRim = new THREE.PointLight(0x6bb9ff, 115, 24, 1.65);
  coolRim.position.set(7, 2.2, -6.5);
  if (!leanPerformance) scene.add(warmRim, coolRim);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5.2, detail(80, 32)),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.y = 0.22;
  shadow.position.set(0, -3.02, 0.3);
  scene.add(shadow);

  let baseCameraDistance = 14;
  let isVisible = false;
  let frameHandle = 0;
  let fallbackTimer = 0;
  let lastRenderTime = 0;
  let scrollWakeUntil = 0;
  let sceneStart = 0;
  let sceneRunway = 1;
  const needsFrameFallback = phonePerformance || safariPerformance;
  const frameFallbackDelay = safariPerformance ? 24 : 42;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionKeys = ["explode", "fold", "orbit", "turn", "dive"];
  const motionState = {
    initialized: false,
    explode: 0,
    fold: 1,
    orbit: 0,
    turn: 0,
    dive: 0,
  };
  const motionFollowRate = 30;
  const motionEpsilon = 0.0005;
  const tmpTarget = new THREE.Vector3();
  const lensApproachNormal = new THREE.Vector3();
  const baseCamera = new THREE.Vector3();
  const targetCamera = new THREE.Vector3();
  const cameraLookAt = new THREE.Vector3();
  const origin = new THREE.Vector3(0, 0.05, 0);
  const rightLensCenter = lensPortalOutline
    .reduce((center, point) => center.add(point), new THREE.Vector3())
    .multiplyScalar(1 / lensPortalOutline.length);

  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smoother = (value) => {
    const amount = clamp01(value);
    return amount * amount * amount * (amount * (amount * 6 - 15) + 10);
  };
  const readVar = (styles, name) => {
    const raw = styles.getPropertyValue(name);
    return clamp01(parseFloat(raw) || 0);
  };

  const projectLensPoint = (point, width, height) => {
    const projected = point.clone()
      .applyMatrix4(leftLens.matrix)
      .applyMatrix4(product.matrix)
      .project(camera);
    return {
      x: Math.max(-width * 2, Math.min(width * 3, (projected.x * 0.5 + 0.5) * width)),
      y: Math.max(-height * 2, Math.min(height * 3, (-projected.y * 0.5 + 0.5) * height)),
      visible: Number.isFinite(projected.x) && Number.isFinite(projected.y) && projected.z < 1.2,
    };
  };

  // Waveguide optics rectify the projected image for the wearer. Follow the
  // live lens center and silhouette, but keep the interface horizon-stable and
  // proportionally scaled instead of applying a harsh trapezoidal warp.
  const rectifiedLensTransform = (
    outline,
    topEdge,
    width,
    height,
    expansion,
    levelAmount
  ) => {
    const edgeX = topEdge[1].x - topEdge[0].x;
    const edgeY = topEdge[1].y - topEdge[0].y;
    const edgeLength = Math.max(0.001, Math.hypot(edgeX, edgeY));
    let physicalAngle = Math.atan2(edgeY / edgeLength, edgeX / edgeLength);
    if (Math.cos(physicalAngle) < 0) {
      physicalAngle += physicalAngle > 0 ? -Math.PI : Math.PI;
    }
    // Preserve a hint of the lens roll while simulating the optical
    // stabilization that keeps an AR display readable to the wearer.
    const stabilizedAngle = Math.max(
      -THREE.MathUtils.degToRad(3),
      Math.min(THREE.MathUtils.degToRad(3), physicalAngle * 0.22)
    );
    const axisX = Math.cos(stabilizedAngle);
    const axisY = Math.sin(stabilizedAngle);
    const normalX = -axisY;
    const normalY = axisX;
    const average = outline.reduce(
      (total, point) => ({ x: total.x + point.x, y: total.y + point.y }),
      { x: 0, y: 0 }
    );
    average.x /= outline.length;
    average.y /= outline.length;

    let minAlong = Infinity;
    let maxAlong = -Infinity;
    let minAcross = Infinity;
    let maxAcross = -Infinity;
    outline.forEach((point) => {
      const offsetX = point.x - average.x;
      const offsetY = point.y - average.y;
      const along = offsetX * axisX + offsetY * axisY;
      const across = offsetX * normalX + offsetY * normalY;
      minAlong = Math.min(minAlong, along);
      maxAlong = Math.max(maxAlong, along);
      minAcross = Math.min(minAcross, across);
      maxAcross = Math.max(maxAcross, across);
    });

    // Uniform contain preserves the complete Socials page and its proportions.
    // The parent lens mask carries the matching dark display background all
    // the way to the physical rim, so the lens is still fully illuminated
    // without cropping channels or stretching typography.
    const lensScale = Math.min(
      0.78,
      Math.min((maxAlong - minAlong) / width, (maxAcross - minAcross) / height) * 0.97
    );
    // Level the interface while it is still contained by the nearly
    // full-screen lens. By the time the mask begins expanding into the
    // Socials scene, the page is already perfectly horizontal instead of
    // carrying a few degrees of lens roll through the handoff.
    const angle = mix(stabilizedAngle, 0, levelAmount);
    const scale = mix(lensScale, 1, expansion);
    // Optical stabilization places the image on the viewer's sightline, not
    // at the off-axis geometric center of the rotating lens. Because reveal
    // now begins only when the lens is almost full-frame, the centered image
    // remains inside the glass and becomes the exact origin of the next scene.
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const translateX =
      centerX - (cosine * scale * width * 0.5 - sine * scale * height * 0.5);
    const translateY =
      centerY - (sine * scale * width * 0.5 + cosine * scale * height * 0.5);
    const values = [
      cosine * scale, sine * scale, 0, 0,
      -sine * scale, cosine * scale, 0, 0,
      0, 0, 1, 0,
      translateX, translateY, 0, 1,
    ];
    return `matrix3d(${values.map((value) => value.toFixed(8)).join(",")})`;
  };

  const rectanglePerimeterPoint = (progress, width, height) => {
    const amount = ((progress % 1) + 1) % 1;
    if (amount < 0.25) return { x: amount * 4 * width, y: 0 };
    if (amount < 0.5) return { x: width, y: (amount - 0.25) * 4 * height };
    if (amount < 0.75) return { x: (1 - (amount - 0.5) * 4) * width, y: height };
    return { x: 0, y: (1 - (amount - 0.75) * 4) * height };
  };

  const syncLensSocials = (diveAmount) => {
    if (!contactViewport || !lensSocialsSurface) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const reveal = smoother((diveAmount - 0.82) / 0.16);
    const expansion = smoother((diveAmount - 0.92) / 0.08);
    const levelAmount = smoother((diveAmount - 0.88) / 0.04);
    contactViewport.style.setProperty("--lens-screen", reveal.toFixed(4));
    contactViewport.style.setProperty("--socials-expand", expansion.toFixed(4));

    // Once the camera has crossed the lens plane, its 3D projection is no
    // longer meaningful. Complete the handoff first so a behind-camera point
    // can never strand the Socials page in its previous skewed pose.
    if (expansion > 0.999) {
      contactViewport.style.clipPath = "inset(0)";
      contactViewport.style.webkitClipPath = "inset(0)";
      lensSocialsSurface.style.transform = "none";
      contactViewport.dataset.lensPortal = "tracked";
      return;
    }

    camera.updateMatrixWorld();
    leftLens.updateMatrix();
    const projectedOutline = lensPortalOutline.map((point) =>
      projectLensPoint(point, width, height)
    );
    const projectedTopEdge = lensPortalTopEdge.map((point) =>
      projectLensPoint(point, width, height)
    );
    if (
      projectedOutline.some((point) => !point.visible) ||
      projectedTopEdge.some((point) => !point.visible)
    ) {
      // Crossing the lens plane can place one sampled edge behind the camera
      // for a few frames. By then the projected lens already covers the
      // viewport, so finish the takeover instead of freezing the last skew.
      if (expansion > 0.55) {
        contactViewport.style.clipPath = "inset(0)";
        contactViewport.style.webkitClipPath = "inset(0)";
        lensSocialsSurface.style.transform = "none";
        contactViewport.dataset.lensPortal = "tracked";
      }
      return;
    }

    const clipPoints = projectedOutline.map((point, index) => {
      const destination = rectanglePerimeterPoint(
        index / projectedOutline.length,
        width,
        height
      );
      return `${mix(point.x, destination.x, expansion).toFixed(2)}px ${mix(
        point.y,
        destination.y,
        expansion
      ).toFixed(2)}px`;
    });
    const clip = `polygon(${clipPoints.join(",")})`;
    contactViewport.style.clipPath = clip;
    contactViewport.style.webkitClipPath = clip;

    lensSocialsSurface.style.transform = rectifiedLensTransform(
      projectedOutline,
      projectedTopEdge,
      width,
      height,
      expansion,
      levelAmount
    );
    contactViewport.dataset.lensPortal = "tracked";
  };

  const measureScene = () => {
    const scene = viewport.closest(".scene");
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    sceneStart = window.scrollY + rect.top;
    sceneRunway = Math.max(1, rect.height - window.innerHeight);
  };

  const readLiveTimeline = () => {
    if (typeof window.glassesTimelineAt !== "function") return null;
    const progress = clamp01((window.scrollY - sceneStart) / sceneRunway);
    return window.glassesTimelineAt(progress);
  };

  const resize = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const aspect = width / height;
    // Match the reference's restrained 9:16 product framing: the hero object
    // occupies roughly sixty percent of the available width, with enough
    // negative space for the floor light and the exploded depth layers.
    const verticalDistance = 9.2 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const horizontalDistance = 15.8 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    baseCameraDistance = Math.max(18, verticalDistance, horizontalDistance);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // Bound fill-rate by actual canvas area. Large Retina windows otherwise
    // create a multi-megapixel WebGL buffer on every scroll frame; this keeps
    // the desktop result crisp while holding Safari's lean profile near 1.9 MP.
    const areaRatio = Math.sqrt(renderPixelBudget / Math.max(1, width * height));
    renderer.setPixelRatio(Math.min(devicePixelRatio, renderPixelRatio, areaRatio));
    renderer.setSize(width, height, false);
    measureScene();
    scheduleRender();
  };

  const scheduleRender = () => {
    // Use the cached scene runway instead of the page-wide active-scene marker.
    // Optics is already visible during its Hangar crossfade, before the
    // midpoint marker switches, and should be rendering throughout that handoff.
    isVisible =
      window.scrollY > sceneStart - window.innerHeight * 1.1 &&
      window.scrollY < sceneStart + sceneRunway + window.innerHeight * 1.1;
    if (!frameHandle && isVisible && !document.hidden) {
      frameHandle = requestAnimationFrame(render);
      // Safari can defer animation callbacks during momentum scrolling or
      // screen capture. Cancel the stranded callback and draw the latest state
      // directly so later scroll events cannot collapse into one large jump.
      if (needsFrameFallback && !fallbackTimer) {
        fallbackTimer = window.setTimeout(() => {
          fallbackTimer = 0;
          if (frameHandle) cancelAnimationFrame(frameHandle);
          frameHandle = 0;
          render(performance.now());
        }, frameFallbackDelay);
      }
    }
  };

  const render = (time = 0, force = false) => {
    frameHandle = 0;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
    if ((!isVisible && !force) || document.hidden) return;

    // The scrub engine writes inline values while this scene is near. Fall
    // back to one computed-style read only for the model's initial frame.
    const inlineStyles = viewport.style;
    const styles = inlineStyles.getPropertyValue("--orbit") ? inlineStyles : getComputedStyle(viewport);
    const liveTimeline = force ? null : readLiveTimeline();
    const targetState = liveTimeline ? {
      explode: liveTimeline.explode,
      fold: liveTimeline.fold,
      orbit: liveTimeline.orbit,
      turn: liveTimeline.turn,
      dive: liveTimeline.dive,
    } : {
      explode: reducedMotion ? 0 : readVar(styles, "--explode"),
      fold: reducedMotion ? 0 : readVar(styles, "--fold"),
      orbit: reducedMotion ? 1 : readVar(styles, "--orbit"),
      turn: reducedMotion ? 1 : readVar(styles, "--turn"),
      dive: reducedMotion ? 0 : readVar(styles, "--dive"),
    };
    if (reducedMotion && liveTimeline) {
      targetState.explode = 0;
      targetState.fold = 0;
      targetState.orbit = 1;
      targetState.turn = 1;
      targetState.dive = 0;
    }
    const elapsedSeconds = lastRenderTime
      ? Math.min(0.064, Math.max(0, (time - lastRenderTime) / 1000))
      : 1 / 60;
    const followAmount = force || reducedMotion || !motionState.initialized
      ? 1
      : 1 - Math.exp(-elapsedSeconds * motionFollowRate);
    motionKeys.forEach((keyName) => {
      motionState[keyName] = mix(motionState[keyName], targetState[keyName], followAmount);
    });
    motionState.initialized = true;
    lastRenderTime = time;

    const explodeAmount = motionState.explode;
    const templeFold = motionState.fold;
    const orbitAmount = motionState.orbit;
    const wearerTurn = motionState.turn;
    const diveAmount = motionState.dive;
    const motionSettled = motionKeys.every(
      (keyName) => Math.abs(targetState[keyName] - motionState[keyName]) < motionEpsilon
    );

    // The folded temples remain legible through the tinted prescription glass
    // in the opening product shot, then the lenses settle to their deeper
    // finished tint as the arms open.
    lensMaterial.opacity = mix(0.52, 0.74, 1 - templeFold);
    lensEdgeMaterial.opacity = mix(0.4, 0.5, 1 - templeFold);

    // The combiner is practically invisible in the assembled product and only
    // becomes legible as a separate optical layer during the exploded view.
    internalParts.forEach((part) => {
      part.visible = explodeAmount > 0.015;
    });
    waveguideMaterial.opacity = mix(0, 0.22, explodeAmount);
    cameraSensorBody.visible = explodeAmount > 0.015;
    parts.forEach((part) => {
      const base = part.userData.basePosition;
      const offset = part.userData.explodeOffset;
      part.position.set(
        base.x + offset.x * explodeAmount,
        base.y + offset.y * explodeAmount,
        base.z + offset.z * explodeAmount
      );
      if (part.userData.internalOnly) {
        const baseRotation = part.userData.baseRotation;
        const rotation = part.userData.explodeRotation;
        part.rotation.set(
          baseRotation.x + rotation.x * explodeAmount,
          baseRotation.y + rotation.y * explodeAmount,
          baseRotation.z + rotation.z * explodeAmount
        );
      }
    });

    // Both temples are true hinge-pivoted parts. They begin folded behind the
    // lenses, settle into their open detents before the left-profile exploded
    // view, and remain open through the reassembly and wearer-side dive.
    const foldAngle = templeFold * Math.PI * 0.27;
    leftTemple.rotation.y = -0.035 - foldAngle;
    rightTemple.rotation.y = 0.035 + foldAngle;
    leftTemple.rotation.z = -0.12 * templeFold;
    rightTemple.rotation.z = 0.14 * templeFold;
    leftTemple.position.x -= templeFold * 0.1;
    rightTemple.position.x += templeFold * 0.12;
    leftTemple.position.y -= templeFold * 0.36;
    rightTemple.position.y -= templeFold * 0.5;
    leftTemple.position.z -= templeFold * 0.24;
    rightTemple.position.z -= templeFold * 0.36;

    const profileLead = clamp01(orbitAmount / 0.25);
    const profileEase = profileLead * profileLead * (3 - 2 * profileLead);
    const foldedHeroYaw = mix(Math.PI * 0.36, 0, profileEase);
    const fullTurn =
      -orbitAmount * Math.PI * 2 + Math.sin(orbitAmount * Math.PI) * 0.05;
    // Continue the same clockwise orbit used by the exploded sequence. A
    // negative half-turn lands at the identical wearer orientation without
    // reversing direction during the camera approach.
    const wearerAngle = -Math.PI;
    product.rotation.y = foldedHeroYaw + fullTurn + wearerAngle * wearerTurn;
    product.rotation.x =
      Math.sin(orbitAmount * Math.PI * 2) * 0.095 +
      mix(0.035, 0.62, wearerTurn) -
      templeFold * 0.16;
    product.rotation.z = mix(Math.sin(orbitAmount * Math.PI * 2) * 0.028, -0.04, wearerTurn);
    product.position.x = mix(0, -0.12, wearerTurn);
    product.position.y = mix(0.25, 2.1, wearerTurn);
    // Product is a direct child of the identity scene, so its local matrix is
    // also its world matrix. Updating only this matrix avoids walking the full
    // glasses hierarchy here and then walking it again inside renderer.render.
    product.updateMatrix();

    // Aim at the sampled center of the actual wearer-side lens, including the
    // lens part's own live transform. The camera used to move toward this
    // target while continuing to look mostly at the glasses origin, which left
    // the physical lens center stranded in the upper-right of the viewport.
    leftLens.updateMatrix();
    tmpTarget.copy(rightLensCenter);
    tmpTarget.applyMatrix4(leftLens.matrix);
    tmpTarget.applyMatrix4(product.matrix);
    baseCamera.set(0, 0.2, baseCameraDistance + wearerTurn * (1 - diveAmount) * 3.2);
    lensApproachNormal.set(0, 0, -1).applyQuaternion(product.quaternion).normalize();
    // Finish just off the wearer-side lens surface, following its true normal
    // instead of assuming the tilted product still faces global camera-Z.
    targetCamera.copy(tmpTarget).addScaledVector(lensApproachNormal, 0.18);
    camera.position.lerpVectors(baseCamera, targetCamera, diveAmount);
    const glideArc = Math.sin(diveAmount * Math.PI);
    camera.position.x += glideArc * 0.5;
    camera.position.y += glideArc * 0.22;
    camera.position.z += glideArc * 0.26;
    // Lock the gaze onto the lens before the close approach. Position and aim
    // now converge in the same coordinate system, so the zoom lands on the
    // center of the glass rather than its lower-left edge.
    var lensFocusAmount = smoother(diveAmount / 0.58);
    cameraLookAt.copy(origin).lerp(tmpTarget, lensFocusAmount);
    camera.lookAt(cameraLookAt);
    syncLensSocials(diveAmount);

    shadow.material.opacity = 0.28 * (1 - diveAmount);
    const canvasObscured = Boolean(liveTimeline && liveTimeline.feed >= 0.985 && motionSettled);
    try {
      // Once the wearer HUD is fully opaque there is no visible 3D surface to
      // update. A reverse scroll schedules a fresh frame immediately.
      if (!canvasObscured) renderer.render(scene, camera);
      if (!viewport.classList.contains("glasses-webgl-ready")) {
        viewport.classList.remove("glasses-webgl-loading", "glasses-webgl-failed");
        viewport.classList.add("glasses-webgl-ready");
      }
    } catch (error) {
      viewport.classList.remove("glasses-webgl-ready", "glasses-webgl-loading");
      viewport.classList.add("glasses-webgl-failed");
      return;
    }
    // Keep drawing only while the rendered pose is catching up with the latest
    // scroll target. This restores fluid motion without an always-on GPU loop.
    if (
      !force &&
      !reducedMotion &&
      !canvasObscured &&
      (!motionSettled || time < scrollWakeUntil)
    ) {
      scheduleRender();
    }
  };

  viewport.dataset.glassesRenderProfile = phonePerformance ? "mobile" : leanPerformance ? "lite" : "full";
  resize();
  // Warm every expensive geometry/material/camera combination—not just the
  // assembled opening pose. Three.js does not upload hidden exploded parts or
  // compile their draw state until they are rendered at least once, which was
  // the source of the large first-scroll stalls seen in Safari recordings.
  const prewarmProperties = ["--fold", "--explode", "--orbit", "--turn", "--dive"];
  const restoredProperties = new Map(
    prewarmProperties.map((property) => [property, viewport.style.getPropertyValue(property)])
  );
  const prewarmStates = [
    [1, 0, 0, 0, 0],
    [0, 0, 0.2, 0, 0],
    [0, 1, 0.55, 0, 0],
    [0, 0, 1, 1, 0.35],
    [0, 0, 1, 1, 1],
  ];
  prewarmStates.forEach((state) => {
    prewarmProperties.forEach((property, propertyIndex) => {
      viewport.style.setProperty(property, String(state[propertyIndex]));
    });
    render(performance.now(), true);
  });
  restoredProperties.forEach((value, property) => {
    if (value) viewport.style.setProperty(property, value);
    else viewport.style.removeProperty(property);
  });
  render(performance.now(), true);
  viewport.dataset.glassesPrewarm = "complete";
  window.addEventListener("resize", resize, { passive: true });
  const wakeScrollRenderer = () => {
    // Continue sampling compositor-owned scroll position between coalesced
    // Safari events. This prevents a single delayed event from becoming a
    // visible jump even during momentum scrolling or screen recording.
    scrollWakeUntil = performance.now() + 800;
    scheduleRender();
  };
  window.addEventListener("scroll", wakeScrollRenderer, { passive: true });
  window.addEventListener("wheel", wakeScrollRenderer, { passive: true });
  window.addEventListener("touchmove", wakeScrollRenderer, { passive: true });
  window.addEventListener("scene:sync", scheduleRender);
  window.addEventListener("site:ready", () => {
    measureScene();
    scheduleRender();
  });
  window.addEventListener("pageshow", () => {
    measureScene();
    scheduleRender();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    viewport.classList.remove("glasses-webgl-ready", "glasses-webgl-loading");
    viewport.classList.add("glasses-webgl-failed");
    if (frameHandle) cancelAnimationFrame(frameHandle);
    frameHandle = 0;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = 0;
  });

  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0] ? entries[0].isIntersecting : false;
    if (isVisible) {
      scheduleRender();
    } else {
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    }
  }, { rootMargin: "35% 0px" });
  observer.observe(viewport);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (frameHandle) cancelAnimationFrame(frameHandle);
      frameHandle = 0;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = 0;
      return;
    }
    scheduleRender();
  });
}
