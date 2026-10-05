"use client";

import { useEffect, useRef, useState } from "react";
import type {
  BufferGeometry as ThreeBufferGeometry,
  Material as ThreeMaterial,
  Vector2 as ThreeVector2,
} from "three";

type MonolithSceneProps = {
  opened: boolean;
  onToggle: () => void;
};

type RuntimeState = {
  opened: boolean;
  reveal: number;
  openProgress: number;
  topOpen: number;
  middleOpen: number;
  bottomOpen: number;
  topOpenVelocity: number;
  middleOpenVelocity: number;
  bottomOpenVelocity: number;
  manualRotX: number;
  manualRotY: number;
  angularVelocityX: number;
  angularVelocityY: number;
  targetRotX: number;
  targetRotY: number;
  currentRotX: number;
  currentRotY: number;
  pointerX: number;
  pointerY: number;
  targetPresence: number;
  presence: number;
  lightTargetX: number;
  lightTargetY: number;
  lightTargetZ: number;
  releaseEnergy: number;
  rayLagX: number;
  rayLagY: number;
  dragging: boolean;
};

const RESTING_ROTATION_X = -0.06;
const RESTING_ROTATION_Y = -0.22;
const ROTATION_X_MIN = -0.31;
const ROTATION_X_MAX = 0.19;
const ROTATION_Y_MIN = -0.79;
const ROTATION_Y_MAX = 0.37;
const DRAG_SENSITIVITY_X = 0.00142;
const DRAG_SENSITIVITY_Y = 0.0019;

const initialRuntime = (opened: boolean): RuntimeState => ({
  opened,
  reveal: 0,
  openProgress: opened ? 1 : 0,
  topOpen: opened ? 1 : 0,
  middleOpen: opened ? 1 : 0,
  bottomOpen: opened ? 1 : 0,
  topOpenVelocity: 0,
  middleOpenVelocity: 0,
  bottomOpenVelocity: 0,
  manualRotX: RESTING_ROTATION_X,
  manualRotY: RESTING_ROTATION_Y,
  angularVelocityX: 0,
  angularVelocityY: 0,
  targetRotX: RESTING_ROTATION_X,
  targetRotY: RESTING_ROTATION_Y,
  currentRotX: RESTING_ROTATION_X,
  currentRotY: RESTING_ROTATION_Y,
  pointerX: 0,
  pointerY: 0,
  targetPresence: 0,
  presence: 0,
  lightTargetX: 0,
  lightTargetY: 0,
  lightTargetZ: 4.4,
  releaseEnergy: 0,
  rayLagX: 0,
  rayLagY: 0,
  dragging: false,
});

export function MonolithScene({ opened, onToggle }: MonolithSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<RuntimeState>(initialRuntime(opened));
  const toggleRef = useRef(onToggle);
  const [renderState, setRenderState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );

  useEffect(() => {
    toggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    runtimeRef.current.opened = opened;
  }, [opened]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let disposed = false;
    let animationFrame = 0;
    let removeListeners = () => {};

    const initialize = async () => {
      try {
        const saveData = (
          navigator as Navigator & { connection?: { saveData?: boolean } }
        ).connection?.saveData;
        if (saveData) {
          setRenderState("fallback");
          return;
        }

        const [THREE, { RoomEnvironment }, { RectAreaLightUniformsLib }] =
          await Promise.all([
            import("three"),
            import("three/addons/environments/RoomEnvironment.js"),
            import("three/addons/lights/RectAreaLightUniformsLib.js"),
          ]);
        if (disposed) return;

        RectAreaLightUniformsLib.init();

        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        const modestDevice =
          window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, modestDevice ? 1.4 : 2.15),
        );
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.74;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
        camera.position.set(0, 0, 7.15);

        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = new RoomEnvironment();
        const environmentTarget = pmrem.fromScene(environment, 0.04);
        scene.environment = environmentTarget.texture;
        environment.dispose();
        pmrem.dispose();

        const ambient = new THREE.AmbientLight(0x343332, 0.42);
        scene.add(ambient);

        const keyLight = new THREE.RectAreaLight(0xbdb6ae, 2.2, 3.8, 4.6);
        keyLight.position.set(-3.7, 3.8, 4.8);
        keyLight.lookAt(0, 0.12, 0);
        scene.add(keyLight);

        const coolStrip = new THREE.RectAreaLight(0x45545c, 0.78, 1.15, 4.8);
        coolStrip.position.set(3.7, 0.25, 3.1);
        coolStrip.lookAt(0, 0, 0);
        scene.add(coolStrip);

        const crownLight = new THREE.SpotLight(
          0xd8cbbb,
          3.35,
          22,
          0.45,
          0.9,
          1.6,
        );
        crownLight.position.set(-1.5, 5.5, 5.8);
        crownLight.target.position.set(0, 0.45, 0);
        scene.add(crownLight, crownLight.target);

        const pointerLight = new THREE.PointLight(0xa99d8e, 2.6, 13, 1.8);
        pointerLight.position.set(0, 0, 4.4);
        scene.add(pointerLight);

        const rearWarmth = new THREE.PointLight(0x402613, 0.9, 9, 1.9);
        rearWarmth.position.set(-0.35, -0.15, -2.2);
        scene.add(rearWarmth);

        const faceMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x010203,
          metalness: 0,
          roughness: 0.16,
          clearcoat: 0.88,
          clearcoatRoughness: 0.085,
          reflectivity: 0.27,
          ior: 1.48,
          specularIntensity: 0.36,
          specularColor: 0x697278,
          envMapIntensity: 0.43,
        });
        const sideMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x010202,
          metalness: 0,
          roughness: 0.24,
          clearcoat: 0.62,
          clearcoatRoughness: 0.135,
          specularIntensity: 0.24,
          specularColor: 0x485157,
          envMapIntensity: 0.34,
        });
        const cutMaterial = new THREE.MeshStandardMaterial({
          color: 0x010101,
          metalness: 0.1,
          roughness: 0.48,
          envMapIntensity: 0.35,
        });
        const innerShellMaterial = new THREE.MeshPhysicalMaterial({
          color: 0x74848a,
          metalness: 0.46,
          roughness: 0.21,
          clearcoat: 0.82,
          clearcoatRoughness: 0.09,
          emissive: 0xcce8f3,
          emissiveIntensity: 0,
          envMapIntensity: 1.05,
        });
        const lumenMaterial = new THREE.MeshBasicMaterial({
          color: 0xf4fbff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });

        const signedArea = (points: ThreeVector2[]) =>
          points.reduce((sum, point, index) => {
            const next = points[(index + 1) % points.length];
            return sum + point.x * next.y - next.x * point.y;
          }, 0) * 0.5;

        const insetConvexPolygon = (
          points: ThreeVector2[],
          distance: number,
        ): ThreeVector2[] => {
          const orientation = signedArea(points) >= 0 ? 1 : -1;
          const cross = (a: ThreeVector2, b: ThreeVector2) =>
            a.x * b.y - a.y * b.x;

          return points.map((point, index) => {
            const previous = points[(index - 1 + points.length) % points.length];
            const next = points[(index + 1) % points.length];
            const previousDirection = point.clone().sub(previous);
            const nextDirection = next.clone().sub(point);
            const previousNormal = new THREE.Vector2(
              -previousDirection.y * orientation,
              previousDirection.x * orientation,
            ).normalize();
            const nextNormal = new THREE.Vector2(
              -nextDirection.y * orientation,
              nextDirection.x * orientation,
            ).normalize();

            const previousLineStart = previous
              .clone()
              .addScaledVector(previousNormal, distance);
            const currentLineStart = point
              .clone()
              .addScaledVector(nextNormal, distance);
            const denominator = cross(previousDirection, nextDirection);

            if (Math.abs(denominator) < 1e-6) {
              const bisector = previousNormal.clone().add(nextNormal);
              return bisector.lengthSq() < 1e-6
                ? point.clone().addScaledVector(previousNormal, distance)
                : point.clone().addScaledVector(bisector.normalize(), distance);
            }

            const offset = currentLineStart.clone().sub(previousLineStart);
            const t = cross(offset, nextDirection) / denominator;
            return previousLineStart.addScaledVector(previousDirection, t);
          });
        };

        const buildHardSurfaceGeometry = (
          outline: ThreeVector2[],
          depth = 0.46,
          chamferWidth = 0.028,
          chamferDepth = 0.022,
        ) => {
          const frontContour = insetConvexPolygon(outline, chamferWidth);
          const halfDepth = depth * 0.5;
          const layers = [
            { contour: frontContour, z: halfDepth },
            { contour: outline, z: halfDepth - chamferDepth },
            { contour: outline, z: -halfDepth + chamferDepth },
            { contour: frontContour, z: -halfDepth },
          ];
          const positions: number[] = [];
          layers.forEach((layer) => {
            layer.contour.forEach((point) => positions.push(point.x, point.y, layer.z));
          });

          const count = outline.length;
          const frontIndices: number[] = [];
          const backIndices: number[] = [];
          const chamferIndices: number[] = [];
          const sideIndices: number[] = [];
          const triangulation = THREE.ShapeUtils.triangulateShape(frontContour, []);

          const appendFace = (
            target: number[],
            a: number,
            b: number,
            c: number,
            positiveZ: boolean,
          ) => {
            const ax = positions[a * 3];
            const ay = positions[a * 3 + 1];
            const bx = positions[b * 3];
            const by = positions[b * 3 + 1];
            const cx = positions[c * 3];
            const cy = positions[c * 3 + 1];
            const crossZ = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
            if ((crossZ > 0) !== positiveZ) target.push(a, c, b);
            else target.push(a, b, c);
          };

          triangulation.forEach(([a, b, c]) => {
            appendFace(frontIndices, a, b, c, true);
            appendFace(backIndices, 3 * count + a, 3 * count + b, 3 * count + c, false);
          });

          const appendBand = (target: number[], firstLayer: number, secondLayer: number) => {
            for (let index = 0; index < count; index += 1) {
              const next = (index + 1) % count;
              const a = firstLayer * count + index;
              const b = secondLayer * count + index;
              const c = secondLayer * count + next;
              const d = firstLayer * count + next;
              target.push(a, b, c, a, c, d);
            }
          };

          appendBand(chamferIndices, 0, 1);
          appendBand(sideIndices, 1, 2);
          appendBand(chamferIndices, 2, 3);

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(positions, 3),
          );
          const indices = [
            ...frontIndices,
            ...backIndices,
            ...chamferIndices,
            ...sideIndices,
          ];
          geometry.setIndex(indices);
          geometry.clearGroups();
          let groupStart = 0;
          const faceCount = frontIndices.length + backIndices.length;
          geometry.addGroup(groupStart, faceCount, 0);
          groupStart += faceCount;
          geometry.addGroup(groupStart, chamferIndices.length, 1);
          groupStart += chamferIndices.length;
          geometry.addGroup(groupStart, sideIndices.length, 2);

          // Indexed normals are area weighted: large planes remain visually
          // flat while the micro-chamfer carries the perimeter highlight.
          geometry.computeVertexNormals();
          geometry.normalizeNormals();
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          return geometry;
        };

        type SurfaceVertex = {
          x: number;
          y: number;
          z: number;
        };

        const vertex = (x: number, y: number, z: number): SurfaceVertex => ({
          x,
          y,
          z,
        });
        const point = (x: number, y: number) => new THREE.Vector2(x, y);

        const CORE_TOP = 1.255;
        const CORE_BOTTOM = -1.3;
        const CORE_CENTER_Y = (CORE_TOP + CORE_BOTTOM) * 0.5;
        const CORE_HALF_HEIGHT = (CORE_TOP - CORE_BOTTOM) * 0.5;
        const CORE_HALF_WIDTH = 0.65;
        const CORE_FRONT_BASE = 0.245;
        const CORE_FRONT_DEPTH = 0.112;
        const CORE_EXPONENT = 2.12;

        const signedPower = (value: number, exponent: number) =>
          Math.sign(value) * Math.pow(Math.abs(value), exponent);
        const coreTerms = (x: number, y: number) => {
          const normalizedX = x / CORE_HALF_WIDTH;
          const normalizedY = (y - CORE_CENTER_Y) / CORE_HALF_HEIGHT;
          const xTerm = Math.pow(Math.abs(normalizedX), CORE_EXPONENT);
          const yTerm = Math.pow(Math.abs(normalizedY), CORE_EXPONENT);
          return {
            normalizedX,
            normalizedY,
            radial: Math.max(0, 1 - xTerm - yTerm),
          };
        };
        const halfWidthAtY = (y: number) => {
          const normalizedY = THREE.MathUtils.clamp(
            Math.abs((y - CORE_CENTER_Y) / CORE_HALF_HEIGHT),
            0,
            1,
          );
          return (
            CORE_HALF_WIDTH *
            Math.pow(
              Math.max(0, 1 - Math.pow(normalizedY, CORE_EXPONENT)),
              1 / CORE_EXPONENT,
            )
          );
        };
        const polishedSurfaceZ = (x: number, y: number) => {
          const { radial } = coreTerms(x, y);
          return (
            CORE_FRONT_BASE +
            CORE_FRONT_DEPTH * Math.pow(radial, 1 / CORE_EXPONENT)
          );
        };
        const polishedSurfaceNormal = (x: number, y: number) => {
          const { normalizedX, normalizedY, radial } = coreTerms(x, y);
          const normalX =
            signedPower(normalizedX, CORE_EXPONENT - 1) / CORE_HALF_WIDTH;
          const normalY =
            signedPower(normalizedY, CORE_EXPONENT - 1) / CORE_HALF_HEIGHT;
          const normalZ =
            radial <= 1e-9
              ? 0
              : Math.pow(radial, (CORE_EXPONENT - 1) / CORE_EXPONENT) /
                CORE_FRONT_DEPTH;
          return new THREE.Vector3(normalX, normalY, normalZ).normalize();
        };

        // Every exterior sample lies on one continuous superellipse. The front
        // is the matching shallow superellipsoid, so silhouette and reflections
        // share the same curvature instead of meeting through a separate rim.
        const exteriorVertex = (side: -1 | 1, y: number) =>
          vertex(side * halfWidthAtY(y), y, CORE_FRONT_BASE);
        const tip = vertex(0, CORE_BOTTOM, CORE_FRONT_BASE);
        const crown = vertex(0, CORE_TOP, CORE_FRONT_BASE);
        const lowerRight = exteriorVertex(1, -0.34);
        const upperRight = exteriorVertex(1, 0.27);
        const upperLeft = exteriorVertex(-1, 0.27);
        const lowerLeft = exteriorVertex(-1, -0.34);
        const sampleExteriorSpan = (
          side: -1 | 1,
          start: SurfaceVertex,
          end: SurfaceVertex,
          segments: number,
        ) =>
          Array.from({ length: segments + 1 }, (_, index) => {
            if (index === 0) return start;
            if (index === segments) return end;
            const linearProgress = index / segments;
            const easedProgress =
              0.5 - Math.cos(linearProgress * Math.PI) * 0.5;
            return exteriorVertex(
              side,
              THREE.MathUtils.lerp(start.y, end.y, easedProgress),
            );
          });

        const upperCenter = vertex(0, 0.23, 0.322);
        const lowerCenter = vertex(0, -0.3, 0.325);

        const topRidge = vertex(0, 0.74, 0.35);
        const middleRidge = vertex(0, -0.04, 0.355);
        const bottomRidge = vertex(0, -0.77, 0.345);

        const topRightContour = sampleExteriorSpan(1, upperRight, crown, 22);
        const topLeftContour = sampleExteriorSpan(-1, crown, upperLeft, 22);
        const middleRightContour = sampleExteriorSpan(
          1,
          lowerRight,
          upperRight,
          12,
        );
        const middleLeftContour = sampleExteriorSpan(
          -1,
          upperLeft,
          lowerLeft,
          12,
        );
        const bottomLeftContour = sampleExteriorSpan(-1, lowerLeft, tip, 24);
        const bottomRightContour = sampleExteriorSpan(1, tip, lowerRight, 24);

        const topBoundary = [
          upperLeft,
          upperCenter,
          ...topRightContour,
          ...topLeftContour.slice(1, -1),
        ];
        const middleBoundary = [
          lowerLeft,
          lowerCenter,
          ...middleRightContour,
          upperCenter,
          ...middleLeftContour.slice(0, -1),
        ];
        const bottomBoundary = [
          ...bottomLeftContour,
          ...bottomRightContour.slice(1),
          lowerCenter,
        ];

        const topFacets = [
          [
            upperLeft,
            upperCenter,
            topRidge,
            ...topLeftContour.slice(0, -1),
          ],
          [
            upperCenter,
            ...topRightContour,
            topRidge,
          ],
        ];
        const middleFacets = [
          [
            lowerLeft,
            lowerCenter,
            middleRidge,
            upperCenter,
            ...middleLeftContour.slice(0, -1),
          ],
          [
            lowerCenter,
            ...middleRightContour,
            upperCenter,
            middleRidge,
          ],
        ];
        const bottomFacets = [
          [
            ...bottomLeftContour,
            bottomRidge,
            lowerCenter,
          ],
          [
            lowerCenter,
            bottomRidge,
            ...bottomRightContour,
          ],
        ];

        const buildFacetedPiece = (
          boundary: SurfaceVertex[],
          facets: SurfaceVertex[][],
          cutEdges: Set<number>,
        ) => {
          type Bucket = {
            positions: number[];
            normals: number[];
          };
          const buckets: Bucket[] = Array.from({ length: 3 }, () => ({
            positions: [],
            normals: [],
          }));

          const polygonNormal = (vertices: SurfaceVertex[], zSign: 1 | -1) => {
            const normal = new THREE.Vector3();
            vertices.forEach((current, index) => {
              const next = vertices[(index + 1) % vertices.length];
              normal.x += (current.y - next.y) * (current.z + next.z);
              normal.y += (current.z - next.z) * (current.x + next.x);
              normal.z += (current.x - next.x) * (current.y + next.y);
            });
            if (normal.lengthSq() < 1e-8) normal.set(0, 0, zSign);
            else normal.normalize();
            if (normal.z * zSign < 0) normal.negate();
            return normal;
          };

          const appendTriangle = (
            bucket: Bucket,
            first: SurfaceVertex,
            second: SurfaceVertex,
            third: SurfaceVertex,
            normal: InstanceType<typeof THREE.Vector3>,
          ) => {
            const edgeA = new THREE.Vector3(
              second.x - first.x,
              second.y - first.y,
              second.z - first.z,
            );
            const edgeB = new THREE.Vector3(
              third.x - first.x,
              third.y - first.y,
              third.z - first.z,
            );
            const ordered = edgeA.cross(edgeB).dot(normal) >= 0
              ? [first, second, third]
              : [first, third, second];
            ordered.forEach((surfacePoint) => {
              bucket.positions.push(surfacePoint.x, surfacePoint.y, surfacePoint.z);
              bucket.normals.push(normal.x, normal.y, normal.z);
            });
          };

          const appendTriangleWithNormals = (
            bucket: Bucket,
            vertices: [SurfaceVertex, SurfaceVertex, SurfaceVertex],
            vertexNormals: [
              InstanceType<typeof THREE.Vector3>,
              InstanceType<typeof THREE.Vector3>,
              InstanceType<typeof THREE.Vector3>,
            ],
          ) => {
            const edgeA = new THREE.Vector3(
              vertices[1].x - vertices[0].x,
              vertices[1].y - vertices[0].y,
              vertices[1].z - vertices[0].z,
            );
            const edgeB = new THREE.Vector3(
              vertices[2].x - vertices[0].x,
              vertices[2].y - vertices[0].y,
              vertices[2].z - vertices[0].z,
            );
            const averageNormal = vertexNormals[0]
              .clone()
              .add(vertexNormals[1])
              .add(vertexNormals[2])
              .normalize();
            const order = edgeA.cross(edgeB).dot(averageNormal) >= 0
              ? [0, 1, 2]
              : [0, 2, 1];
            order.forEach((orderedIndex) => {
              const surfacePoint = vertices[orderedIndex];
              const normal = vertexNormals[orderedIndex];
              bucket.positions.push(surfacePoint.x, surfacePoint.y, surfacePoint.z);
              bucket.normals.push(normal.x, normal.y, normal.z);
            });
          };

          const appendCurvedTriangle = (
            bucket: Bucket,
            first: SurfaceVertex,
            second: SurfaceVertex,
            third: SurfaceVertex,
            remainingSubdivisions: number,
          ) => {
            if (remainingSubdivisions > 0) {
              const midpoint = (a: SurfaceVertex, b: SurfaceVertex) =>
                vertex((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, 0);
              const firstSecond = midpoint(first, second);
              const secondThird = midpoint(second, third);
              const thirdFirst = midpoint(third, first);
              appendCurvedTriangle(
                bucket,
                first,
                firstSecond,
                thirdFirst,
                remainingSubdivisions - 1,
              );
              appendCurvedTriangle(
                bucket,
                firstSecond,
                second,
                secondThird,
                remainingSubdivisions - 1,
              );
              appendCurvedTriangle(
                bucket,
                thirdFirst,
                secondThird,
                third,
                remainingSubdivisions - 1,
              );
              appendCurvedTriangle(
                bucket,
                firstSecond,
                secondThird,
                thirdFirst,
                remainingSubdivisions - 1,
              );
              return;
            }

            const crossZ =
              (second.x - first.x) * (third.y - first.y) -
              (second.y - first.y) * (third.x - first.x);
            const ordered = crossZ >= 0
              ? [first, second, third]
              : [first, third, second];
            ordered.forEach((surfacePoint) => {
              const normal = polishedSurfaceNormal(surfacePoint.x, surfacePoint.y);
              bucket.positions.push(
                surfacePoint.x,
                surfacePoint.y,
                polishedSurfaceZ(surfacePoint.x, surfacePoint.y),
              );
              bucket.normals.push(normal.x, normal.y, normal.z);
            });
          };

          const appendPolygon = (
            bucket: Bucket,
            vertices: SurfaceVertex[],
            zSign: 1 | -1,
          ) => {
            const normal = polygonNormal(vertices, zSign);
            const triangulation = THREE.ShapeUtils.triangulateShape(
              vertices.map((surfacePoint) =>
                new THREE.Vector2(surfacePoint.x, surfacePoint.y),
              ),
              [],
            );
            triangulation.forEach(([first, second, third]) => {
              appendTriangle(
                bucket,
                vertices[first],
                vertices[second],
                vertices[third],
                normal,
              );
            });
          };

          const appendSide = (
            bucket: Bucket,
            frontStart: SurfaceVertex,
            frontEnd: SurfaceVertex,
            startNormal?: InstanceType<typeof THREE.Vector3>,
            endNormal?: InstanceType<typeof THREE.Vector3>,
          ) => {
            const subdivisions = modestDevice ? 5 : 9;
            const mappedPoint = (progress: number) => {
              const x = THREE.MathUtils.lerp(frontStart.x, frontEnd.x, progress);
              const y = THREE.MathUtils.lerp(frontStart.y, frontEnd.y, progress);
              return vertex(x, y, polishedSurfaceZ(x, y));
            };
            const mappedNormal = (progress: number) =>
              startNormal && endNormal
                ? startNormal.clone().lerp(endNormal, progress).normalize()
                : undefined;

            for (let index = 0; index < subdivisions; index += 1) {
              const startProgress = index / subdivisions;
              const endProgress = (index + 1) / subdivisions;
              const mappedFrontStart = mappedPoint(startProgress);
              const mappedFrontEnd = mappedPoint(endProgress);
              const backStart = vertex(
                mappedFrontStart.x,
                mappedFrontStart.y,
                -0.31,
              );
              const backEnd = vertex(mappedFrontEnd.x, mappedFrontEnd.y, -0.31);
              const interpolatedStartNormal = mappedNormal(startProgress);
              const interpolatedEndNormal = mappedNormal(endProgress);

              if (interpolatedStartNormal && interpolatedEndNormal) {
                appendTriangleWithNormals(
                  bucket,
                  [mappedFrontStart, backStart, backEnd],
                  [
                    interpolatedStartNormal,
                    interpolatedStartNormal,
                    interpolatedEndNormal,
                  ],
                );
                appendTriangleWithNormals(
                  bucket,
                  [mappedFrontStart, backEnd, mappedFrontEnd],
                  [
                    interpolatedStartNormal,
                    interpolatedEndNormal,
                    interpolatedEndNormal,
                  ],
                );
                continue;
              }

              const firstEdge = new THREE.Vector3(
                backStart.x - mappedFrontStart.x,
                backStart.y - mappedFrontStart.y,
                backStart.z - mappedFrontStart.z,
              );
              const secondEdge = new THREE.Vector3(
                backEnd.x - mappedFrontStart.x,
                backEnd.y - mappedFrontStart.y,
                backEnd.z - mappedFrontStart.z,
              );
              const normal = firstEdge.cross(secondEdge).normalize();
              appendTriangle(bucket, mappedFrontStart, backStart, backEnd, normal);
              appendTriangle(
                bucket,
                mappedFrontStart,
                backEnd,
                mappedFrontEnd,
                normal,
              );
            }
          };

          facets.forEach((facet) => {
            const triangulation = THREE.ShapeUtils.triangulateShape(
              facet.map((surfacePoint) =>
                new THREE.Vector2(surfacePoint.x, surfacePoint.y),
              ),
              [],
            );
            triangulation.forEach(([first, second, third]) =>
              appendCurvedTriangle(
                buckets[0],
                facet[first],
                facet[second],
                facet[third],
                modestDevice ? 2 : 3,
              ),
            );
          });
          const backBoundary = boundary.map((surfacePoint) =>
            vertex(surfacePoint.x, surfacePoint.y, -0.31),
          );
          appendPolygon(buckets[1], backBoundary, -1);
          const boundaryPoints = boundary.map((surfacePoint) =>
            point(surfacePoint.x, surfacePoint.y),
          );
          const orientation = signedArea(boundaryPoints) >= 0 ? 1 : -1;
          const edgeOutwards = boundaryPoints.map((surfacePoint, index) => {
            const next = boundaryPoints[(index + 1) % boundaryPoints.length];
            const direction = next.clone().sub(surfacePoint).normalize();
            return new THREE.Vector2(
              direction.y * orientation,
              -direction.x * orientation,
            ).normalize();
          });
          const sideNormals = boundaryPoints.map((_, index) => {
            const previousEdge =
              (index - 1 + boundaryPoints.length) % boundaryPoints.length;
            const candidates: InstanceType<typeof THREE.Vector2>[] = [];
            if (!cutEdges.has(previousEdge)) {
              candidates.push(edgeOutwards[previousEdge]);
            }
            if (!cutEdges.has(index)) candidates.push(edgeOutwards[index]);
            if (candidates.length === 0) candidates.push(edgeOutwards[index]);
            const normal = candidates.reduce(
              (sum, candidate) => sum.add(candidate),
              new THREE.Vector2(),
            );
            if (normal.lengthSq() < 1e-8) normal.copy(edgeOutwards[index]);
            normal.normalize();
            return new THREE.Vector3(normal.x, normal.y, 0).normalize();
          });
          boundary.forEach((surfacePoint, index) => {
            const next = boundary[(index + 1) % boundary.length];
            const isCut = cutEdges.has(index);
            appendSide(
              buckets[isCut ? 2 : 1],
              surfacePoint,
              next,
              isCut ? undefined : sideNormals[index],
              isCut ? undefined : sideNormals[(index + 1) % boundary.length],
            );
          });

          const attributeValueCount = buckets.reduce(
            (total, bucket) => total + bucket.positions.length,
            0,
          );
          const positions = new Float32Array(attributeValueCount);
          const normals = new Float32Array(attributeValueCount);
          const groups: Array<{ start: number; count: number; material: number }> = [];
          let attributeOffset = 0;
          buckets.forEach((bucket, material) => {
            const start = attributeOffset / 3;
            positions.set(bucket.positions, attributeOffset);
            normals.set(bucket.normals, attributeOffset);
            groups.push({
              start,
              count: bucket.positions.length / 3,
              material,
            });
            attributeOffset += bucket.positions.length;
          });

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3),
          );
          geometry.setAttribute(
            "normal",
            new THREE.BufferAttribute(normals, 3),
          );
          groups.forEach((group) =>
            geometry.addGroup(group.start, group.count, group.material),
          );
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();
          return geometry;
        };

        const root = new THREE.Group();
        scene.add(root);

        const coreMaterials = [faceMaterial, sideMaterial, cutMaterial];
        const interactiveMeshes: Array<InstanceType<typeof THREE.Mesh>> = [];
        type SegmentEdge = readonly [SurfaceVertex, SurfaceVertex];
        const resolveCutEdges = (
          boundary: SurfaceVertex[],
          seams: readonly SegmentEdge[],
        ) => {
          const resolved = new Set<number>();
          boundary.forEach((start, index) => {
            const end = boundary[(index + 1) % boundary.length];
            const isSeam = seams.some(
              ([first, second]) =>
                (start === first && end === second) ||
                (start === second && end === first),
            );
            if (isSeam) resolved.add(index);
          });
          return resolved;
        };
        const buildSegment = (
          boundary: SurfaceVertex[],
          facets: SurfaceVertex[][],
          cutEdges: Set<number>,
        ) => {
          const group = new THREE.Group();
          const mesh = new THREE.Mesh(
            buildFacetedPiece(boundary, facets, cutEdges),
            coreMaterials,
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          interactiveMeshes.push(mesh);
          group.add(mesh);
          return group;
        };

        const topSegment = buildSegment(
          topBoundary,
          topFacets,
          resolveCutEdges(topBoundary, [
            [upperLeft, upperCenter],
            [upperCenter, upperRight],
          ]),
        );
        const middleSegment = buildSegment(
          middleBoundary,
          middleFacets,
          resolveCutEdges(middleBoundary, [
            [lowerLeft, lowerCenter],
            [lowerCenter, lowerRight],
            [upperLeft, upperCenter],
            [upperCenter, upperRight],
          ]),
        );
        const bottomSegment = buildSegment(
          bottomBoundary,
          bottomFacets,
          resolveCutEdges(bottomBoundary, [
            [lowerLeft, lowerCenter],
            [lowerCenter, lowerRight],
          ]),
        );

        const completeOutline = [
          ...bottomRightContour,
          ...middleRightContour.slice(1),
          ...topRightContour.slice(1),
          ...topLeftContour.slice(1),
          ...middleLeftContour.slice(1),
          ...bottomLeftContour.slice(1, -1),
        ].map((surfacePoint) => point(surfacePoint.x, surfacePoint.y));
        const innerOutline = completeOutline.map((outlinePoint) =>
          outlinePoint.clone().multiplyScalar(0.7),
        );
        const innerCore = new THREE.Mesh(
          buildHardSurfaceGeometry(innerOutline, 0.42, 0.022, 0.016),
          [innerShellMaterial, innerShellMaterial, innerShellMaterial],
        );
        innerCore.position.z = -0.07;

        const stripOutline = (
          start: ThreeVector2,
          end: ThreeVector2,
          width: number,
        ) => {
          const normal = end
            .clone()
            .sub(start)
            .normalize()
            .rotateAround(new THREE.Vector2(0, 0), Math.PI * 0.5)
            .multiplyScalar(width * 0.5);
          return [
            start.clone().sub(normal),
            end.clone().sub(normal),
            end.clone().add(normal),
            start.clone().add(normal),
          ];
        };
        const buildSeal = (start: SurfaceVertex, end: SurfaceVertex) => {
          const outline = stripOutline(
            point(start.x, start.y),
            point(end.x, end.y),
            0.022,
          );
          const seal = new THREE.Mesh(
            buildHardSurfaceGeometry(outline, 0.45, 0.0018, 0.0018),
            [lumenMaterial, lumenMaterial, lumenMaterial],
          );
          seal.position.z = -0.015;
          return seal;
        };
        const seals = [
          buildSeal(upperLeft, upperCenter),
          buildSeal(upperCenter, upperRight),
          buildSeal(lowerLeft, lowerCenter),
          buildSeal(lowerCenter, lowerRight),
        ];

        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = 256;
        glowCanvas.height = 64;
        const glowContext = glowCanvas.getContext("2d");
        if (glowContext) {
          const gradient = glowContext.createRadialGradient(128, 32, 1, 128, 32, 126);
          gradient.addColorStop(0, "rgba(246,252,255,1)");
          gradient.addColorStop(0.14, "rgba(225,244,255,.76)");
          gradient.addColorStop(0.48, "rgba(181,220,242,.22)");
          gradient.addColorStop(1, "rgba(181,220,242,0)");
          glowContext.fillStyle = gradient;
          glowContext.fillRect(0, 0, 256, 64);
        }
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const gapGlowMaterial = new THREE.MeshBasicMaterial({
          map: glowTexture,
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const buildGapGlow = (y: number) => {
          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(1.08, 0.24),
            gapGlowMaterial,
          );
          glow.position.set(0, y, 0.205);
          return glow;
        };
        const gapGlows = [buildGapGlow(0.245), buildGapGlow(-0.32)];

        const beamGeometry = new THREE.PlaneGeometry(1, 1, 2, 28);
        beamGeometry.translate(0, 0.5, 0);
        const rayEffects: Array<{
          group: InstanceType<typeof THREE.Group>;
          material: InstanceType<typeof THREE.ShaderMaterial>;
          phase: number;
          strength: number;
          layer: 0 | 1;
        }> = [];

        const buildLightRay = (
          origin: InstanceType<typeof THREE.Vector3>,
          direction: InstanceType<typeof THREE.Vector3>,
          width: number,
          length: number,
          phase: number,
          strength: number,
          layer: 0 | 1,
        ) => {
          const material = new THREE.ShaderMaterial({
            uniforms: {
              uOpacity: { value: 0 },
              uTime: { value: 0 },
              uSeed: { value: phase * 17.31 },
              uMotion: { value: 0 },
              uRelease: { value: 0 },
              uLayer: { value: layer },
              uBend: { value: new THREE.Vector2() },
            },
            vertexShader: `
              varying vec2 vUv;
              varying float vDrift;
              uniform float uTime;
              uniform float uSeed;
              uniform float uMotion;
              uniform float uLayer;
              uniform float uRelease;
              uniform vec2 uBend;

              void main() {
                vUv = uv;
                vec3 displaced = position;
                float travel = pow(uv.y, 1.28);
                float slowCurl = sin(
                  uTime * (0.31 + uLayer * 0.08) + uSeed + uv.y * 4.7
                );
                float secondaryCurl = cos(
                  uTime * (0.23 + uLayer * 0.07) + uSeed * 0.71 + uv.y * 3.4
                );
                float livingAmplitude = mix(0.006, 0.014, uLayer)
                  + uMotion * mix(0.012, 0.026, uLayer)
                  + uRelease * 0.012;
                displaced.x += uBend.x * travel
                  + slowCurl * livingAmplitude * travel;
                displaced.z += uBend.y * travel
                  + secondaryCurl * livingAmplitude * travel * 0.72;
                vDrift = slowCurl * 0.5 + secondaryCurl * 0.5;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
              }
            `,
            fragmentShader: `
              varying vec2 vUv;
              varying float vDrift;
              uniform float uOpacity;
              uniform float uTime;
              uniform float uSeed;
              uniform float uMotion;
              uniform float uRelease;
              uniform float uLayer;

              float hash(vec2 point) {
                return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
              }

              float noise(vec2 point) {
                vec2 cell = floor(point);
                vec2 local = fract(point);
                local = local * local * (3.0 - 2.0 * local);
                float a = hash(cell);
                float b = hash(cell + vec2(1.0, 0.0));
                float c = hash(cell + vec2(0.0, 1.0));
                float d = hash(cell + vec2(1.0, 1.0));
                return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
              }

              float fbm(vec2 point) {
                float value = noise(point) * 0.57;
                value += noise(point * 2.03 + 7.1) * 0.28;
                value += noise(point * 4.11 + 19.7) * 0.15;
                return value;
              }

              void main() {
                float distanceFromAxis = abs(vUv.x - 0.5);
                float availableWidth = mix(0.018, 0.5, pow(vUv.y, 0.68));
                float edge = 1.0 - smoothstep(
                  availableWidth * mix(0.58, 0.28, uLayer),
                  availableWidth,
                  distanceFromAxis
                );
                float entrance = smoothstep(0.0, 0.055, vUv.y);
                float distanceFade = 1.0 - smoothstep(0.56, 1.0, vUv.y);
                float core = exp(-pow(distanceFromAxis * mix(4.4, 9.5, uLayer), 2.0));
                float flow = fbm(
                  vec2(
                    vUv.x * mix(4.2, 6.8, uLayer) + uSeed + vDrift * 0.18,
                    vUv.y * 7.4 - uTime * (0.075 + uMotion * 0.13)
                  )
                );
                float travellingCaustic = 0.5 + 0.5 * sin(
                  vUv.x * mix(31.0, 67.0, uLayer)
                    + flow * 7.0
                    - uTime * (0.2 + uMotion * 0.38)
                    + uSeed
                );
                travellingCaustic = pow(travellingCaustic, mix(3.8, 8.0, uLayer));
                float broadDensity = mix(0.72, 1.04, flow) * mix(0.7, 1.0, core);
                float filamentDensity = mix(0.38, 0.86, flow)
                  * (0.4 + core * 0.74)
                  * (0.56 + travellingCaustic * 0.76);
                float density = mix(broadDensity, filamentDensity, uLayer);
                float releaseFront = smoothstep(0.05, 0.28, vUv.y)
                  * (1.0 - smoothstep(0.38, 0.88, vUv.y));
                density *= 1.0 + releaseFront * uRelease * 0.48;
                float alpha = uOpacity * edge * entrance * distanceFade;
                alpha *= density;
                vec3 coldEdge = vec3(0.43, 0.67, 0.84);
                vec3 whiteCore = vec3(0.99, 1.0, 1.0);
                vec3 color = mix(coldEdge, whiteCore, pow(core, 1.18));
                gl_FragColor = vec4(color, alpha);
              }
            `,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            toneMapped: false,
            dithering: true,
          });

          const group = new THREE.Group();
          group.position.copy(origin);
          group.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize(),
          );

          const planeCount = layer === 0 ? 3 : 2;
          for (let index = 0; index < planeCount; index += 1) {
            const plane = new THREE.Mesh(beamGeometry, material);
            plane.scale.set(
              width * (index === 0 ? 1 : layer === 0 ? 0.88 : 0.72),
              length,
              1,
            );
            plane.rotation.y = (Math.PI * index) / planeCount;
            group.add(plane);
          }
          group.scale.set(0.7, 0.14, 0.7);
          rayEffects.push({ group, material, phase, strength, layer });
          return group;
        };

        const primaryRaySpecs = [
          {
            origin: new THREE.Vector3(-0.19, 0.245, 0.205),
            direction: new THREE.Vector3(-0.72, 0.42, 0.78),
            width: 0.42,
            length: 1.48,
            phase: 0.13,
            strength: 1,
          },
          {
            origin: new THREE.Vector3(0.02, 0.245, 0.205),
            direction: new THREE.Vector3(-0.08, 0.61, 0.94),
            width: 0.32,
            length: 1.34,
            phase: 0.26,
            strength: 0.78,
          },
          {
            origin: new THREE.Vector3(0.18, 0.245, 0.205),
            direction: new THREE.Vector3(0.69, 0.31, 0.84),
            width: 0.38,
            length: 1.54,
            phase: 0.41,
            strength: 0.92,
          },
          {
            origin: new THREE.Vector3(-0.14, -0.32, 0.205),
            direction: new THREE.Vector3(-0.65, -0.4, 0.82),
            width: 0.37,
            length: 1.42,
            phase: 0.64,
            strength: 0.88,
          },
          {
            origin: new THREE.Vector3(0.16, -0.32, 0.205),
            direction: new THREE.Vector3(0.74, -0.31, 0.76),
            width: 0.41,
            length: 1.52,
            phase: 0.87,
            strength: 0.96,
          },
        ];
        const filamentRaySpecs = [
          [-0.11, 0.245, -0.5, 0.58, 0.92, 0.11, 1.64, 0.18, 0.96],
          [0.08, 0.245, 0.28, 0.72, 0.96, 0.095, 1.58, 0.32, 0.84],
          [0.22, 0.245, 0.86, 0.18, 0.76, 0.1, 1.72, 0.46, 0.9],
          [-0.22, 0.245, -0.88, 0.17, 0.78, 0.09, 1.7, 0.55, 0.76],
          [-0.07, -0.32, -0.38, -0.58, 0.92, 0.09, 1.54, 0.69, 0.82],
          [0.07, -0.32, 0.33, -0.61, 0.94, 0.085, 1.62, 0.76, 0.86],
          [-0.2, -0.32, -0.82, -0.21, 0.78, 0.1, 1.66, 0.84, 0.74],
          [0.21, -0.32, 0.9, -0.13, 0.74, 0.09, 1.72, 0.94, 0.8],
        ] as const;

        const lightRays = [
          ...primaryRaySpecs.map((spec) =>
            buildLightRay(
              spec.origin,
              spec.direction,
              spec.width,
              spec.length,
              spec.phase,
              spec.strength,
              0,
            ),
          ),
          ...filamentRaySpecs
            .slice(0, modestDevice ? 4 : filamentRaySpecs.length)
            .map((spec) =>
              buildLightRay(
                new THREE.Vector3(spec[0], spec[1], 0.21),
                new THREE.Vector3(spec[2], spec[3], spec[4]),
                spec[5],
                spec[6],
                spec[7],
                spec[8],
                1,
              ),
            ),
        ];

        const moteCount = modestDevice ? 24 : 58;
        const motePositions: number[] = [];
        const moteOrigins: number[] = [];
        const moteDirections: number[] = [];
        const motePhases: number[] = [];
        const moteSizes: number[] = [];
        const pseudoRandom = (seed: number) => {
          const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
          return value - Math.floor(value);
        };
        for (let index = 0; index < moteCount; index += 1) {
          const source = primaryRaySpecs[index % primaryRaySpecs.length];
          const firstJitter = pseudoRandom(index + 1);
          const secondJitter = pseudoRandom(index + 18.7);
          const direction = source.direction.clone().normalize();
          direction.x += (firstJitter - 0.5) * 0.18;
          direction.y += (secondJitter - 0.5) * 0.16;
          direction.normalize();
          motePositions.push(0, 0, 0);
          moteOrigins.push(
            source.origin.x + (firstJitter - 0.5) * 0.05,
            source.origin.y + (secondJitter - 0.5) * 0.035,
            source.origin.z,
          );
          moteDirections.push(direction.x, direction.y, direction.z);
          motePhases.push(pseudoRandom(index + 41.3));
          moteSizes.push(2.1 + pseudoRandom(index + 74.9) * 2.8);
        }
        const moteGeometry = new THREE.BufferGeometry();
        moteGeometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(motePositions, 3),
        );
        moteGeometry.setAttribute(
          "aOrigin",
          new THREE.Float32BufferAttribute(moteOrigins, 3),
        );
        moteGeometry.setAttribute(
          "aDirection",
          new THREE.Float32BufferAttribute(moteDirections, 3),
        );
        moteGeometry.setAttribute(
          "aPhase",
          new THREE.Float32BufferAttribute(motePhases, 1),
        );
        moteGeometry.setAttribute(
          "aSize",
          new THREE.Float32BufferAttribute(moteSizes, 1),
        );
        const moteMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uMotion: { value: 0 },
            uRelease: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() },
          },
          vertexShader: `
            attribute vec3 aOrigin;
            attribute vec3 aDirection;
            attribute float aPhase;
            attribute float aSize;
            uniform float uTime;
            uniform float uOpacity;
            uniform float uMotion;
            uniform float uRelease;
            uniform float uPixelRatio;
            varying float vAlpha;

            void main() {
              float speed = 0.025 + uMotion * 0.026 + uRelease * 0.035;
              float life = fract(aPhase + uTime * speed);
              float travel = 0.08 + life * (1.15 + uRelease * 0.24);
              vec3 displaced = aOrigin + aDirection * travel;
              float wander = (0.008 + life * 0.025) * (1.0 + uMotion * 0.9);
              displaced.x += sin(uTime * 0.47 + aPhase * 31.0 + life * 5.0) * wander;
              displaced.y += cos(uTime * 0.39 + aPhase * 23.0 + life * 4.0) * wander;
              vec4 modelPosition = modelViewMatrix * vec4(displaced, 1.0);
              float lifeFade = sin(life * 3.14159265);
              vAlpha = uOpacity * pow(max(lifeFade, 0.0), 1.4);
              gl_PointSize = aSize * uPixelRatio * (6.4 / max(1.0, -modelPosition.z));
              gl_Position = projectionMatrix * modelPosition;
            }
          `,
          fragmentShader: `
            varying float vAlpha;

            void main() {
              float radius = length(gl_PointCoord - vec2(0.5));
              float softParticle = 1.0 - smoothstep(0.08, 0.5, radius);
              vec3 color = mix(
                vec3(0.52, 0.73, 0.86),
                vec3(1.0),
                1.0 - smoothstep(0.0, 0.32, radius)
              );
              gl_FragColor = vec4(color, softParticle * vAlpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
          dithering: true,
        });
        const lightMotes = new THREE.Points(moteGeometry, moteMaterial);
        lightMotes.frustumCulled = false;

        const coreHaloMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0xeefaff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const coreHalo = new THREE.Sprite(coreHaloMaterial);
        coreHalo.position.set(0, -0.025, 0.08);
        coreHalo.scale.set(1.55, 0.66, 1);

        const interiorLight = new THREE.PointLight(0xe9f7ff, 0, 3.4, 1.65);
        interiorLight.position.set(0, -0.02, 0.1);
        const spillLight = new THREE.PointLight(0xf5fbff, 0, 2.8, 1.9);
        spillLight.position.set(0, -0.02, 0.68);
        const upperCutLight = new THREE.PointLight(0xeaf7ff, 0, 1.45, 1.85);
        upperCutLight.position.set(0, 0.245, 0.26);
        const lowerCutLight = new THREE.PointLight(0xeaf7ff, 0, 1.45, 1.85);
        lowerCutLight.position.set(0, -0.32, 0.26);
        const innerSweepLightA = new THREE.PointLight(0xdaf4ff, 0, 1.9, 1.75);
        innerSweepLightA.position.set(-0.24, 0.14, 0.48);
        const innerSweepLightB = new THREE.PointLight(0xffffff, 0, 1.65, 1.9);
        innerSweepLightB.position.set(0.25, -0.16, 0.43);

        root.add(
          innerCore,
          ...seals,
          ...gapGlows,
          coreHalo,
          ...lightRays,
          lightMotes,
          interiorLight,
          spillLight,
          upperCutLight,
          lowerCutLight,
          innerSweepLightA,
          innerSweepLightB,
          topSegment,
          middleSegment,
          bottomSegment,
        );

        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = 256;
        shadowCanvas.height = 128;
        const context = shadowCanvas.getContext("2d");
        if (context) {
          const gradient = context.createRadialGradient(128, 64, 4, 128, 64, 120);
          gradient.addColorStop(0, "rgba(0,0,0,.78)");
          gradient.addColorStop(0.42, "rgba(0,0,0,.44)");
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          context.fillStyle = gradient;
          context.fillRect(0, 0, 256, 128);
        }
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
        const shadowMaterial = new THREE.SpriteMaterial({
          map: shadowTexture,
          transparent: true,
          depthWrite: false,
          opacity: 0.7,
        });
        const shadow = new THREE.Sprite(shadowMaterial);
        shadow.scale.set(1.64, 0.56, 1);
        shadow.position.set(0, -1.29, -0.42);
        const floorSpillMaterial = new THREE.SpriteMaterial({
          map: glowTexture,
          color: 0xdff5ff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          depthTest: true,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const floorSpill = new THREE.Sprite(floorSpillMaterial);
        floorSpill.scale.set(2.05, 0.48, 1);
        floorSpill.position.set(0, -1.265, -0.35);
        scene.add(shadow, floorSpill);

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        let drag:
          | {
              pointerId: number;
              startX: number;
              startY: number;
              startRotX: number;
              startRotY: number;
              lastX: number;
              lastY: number;
              lastTime: number;
              leverage: number;
              distance: number;
            }
          | null = null;

        const setPointer = (event: PointerEvent) => {
          const bounds = canvas.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
          const y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
          const runtime = runtimeRef.current;
          runtime.pointerX = THREE.MathUtils.clamp(x, -1, 1);
          runtime.pointerY = THREE.MathUtils.clamp(y, -1, 1);

          pointerNdc.set(runtime.pointerX, runtime.pointerY);
          scene.updateMatrixWorld(true);
          raycaster.setFromCamera(pointerNdc, camera);
          const intersection = raycaster.intersectObjects(
            interactiveMeshes,
            false,
          )[0];

          if (intersection) {
            runtime.targetPresence = 1;
            canvas.style.cursor = runtime.dragging ? "grabbing" : "grab";
            const normal = intersection.face
              ? intersection.face.normal
                  .clone()
                  .transformDirection(intersection.object.matrixWorld)
              : new THREE.Vector3(0, 0, 1);
            const lightTarget = intersection.point
              .clone()
              .addScaledVector(normal, 2.25);
            runtime.lightTargetX = lightTarget.x;
            runtime.lightTargetY = lightTarget.y;
            runtime.lightTargetZ = lightTarget.z;
            if (!runtime.dragging) {
              runtime.targetRotY = runtime.manualRotY + runtime.pointerX * 0.018;
              runtime.targetRotX = runtime.manualRotX - runtime.pointerY * 0.012;
            }
            return true;
          }

          if (!runtime.dragging) {
            runtime.targetPresence = 0;
            runtime.lightTargetX = 0;
            runtime.lightTargetY = 0;
            runtime.lightTargetZ = 4.4;
            canvas.style.cursor = "default";
            runtime.targetRotY = runtime.manualRotY;
            runtime.targetRotX = runtime.manualRotX;
          }
          return false;
        };

        const onPointerDown = (event: PointerEvent) => {
          if (!setPointer(event)) return;
          canvas.setPointerCapture(event.pointerId);
          const runtime = runtimeRef.current;
          runtime.dragging = true;
          runtime.angularVelocityX *= 0.14;
          runtime.angularVelocityY *= 0.14;
          canvas.style.cursor = "grabbing";
          drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startRotX: runtime.manualRotX,
            startRotY: runtime.manualRotY,
            lastX: event.clientX,
            lastY: event.clientY,
            lastTime: event.timeStamp,
            leverage: 1 + Math.min(0.22, Math.abs(runtime.pointerY) * 0.18),
            distance: 0,
          };
        };

        const onPointerMove = (event: PointerEvent) => {
          setPointer(event);
          if (!drag || drag.pointerId !== event.pointerId) return;
          const deltaX = event.clientX - drag.startX;
          const deltaY = event.clientY - drag.startY;
          const stepX = event.clientX - drag.lastX;
          const stepY = event.clientY - drag.lastY;
          const stepTime = THREE.MathUtils.clamp(
            (event.timeStamp - drag.lastTime) / 1000,
            0.008,
            0.05,
          );
          drag.distance = Math.max(drag.distance, Math.hypot(deltaX, deltaY));
          const runtime = runtimeRef.current;
          runtime.manualRotY = THREE.MathUtils.clamp(
            drag.startRotY + deltaX * DRAG_SENSITIVITY_Y * drag.leverage,
            ROTATION_Y_MIN,
            ROTATION_Y_MAX,
          );
          runtime.manualRotX = THREE.MathUtils.clamp(
            drag.startRotX + deltaY * DRAG_SENSITIVITY_X * drag.leverage,
            ROTATION_X_MIN,
            ROTATION_X_MAX,
          );
          const measuredVelocityY = THREE.MathUtils.clamp(
            (stepX * DRAG_SENSITIVITY_Y * drag.leverage) / stepTime,
            -1.3,
            1.3,
          );
          const measuredVelocityX = THREE.MathUtils.clamp(
            (stepY * DRAG_SENSITIVITY_X * drag.leverage) / stepTime,
            -0.9,
            0.9,
          );
          runtime.angularVelocityY = THREE.MathUtils.lerp(
            runtime.angularVelocityY,
            measuredVelocityY,
            0.42,
          );
          runtime.angularVelocityX = THREE.MathUtils.lerp(
            runtime.angularVelocityX,
            measuredVelocityX,
            0.42,
          );
          runtime.targetRotY = runtime.manualRotY;
          runtime.targetRotX = runtime.manualRotX;
          drag.lastX = event.clientX;
          drag.lastY = event.clientY;
          drag.lastTime = event.timeStamp;
        };

        const onPointerUp = (event: PointerEvent) => {
          const wasClick = Boolean(
            drag && drag.pointerId === event.pointerId && drag.distance < 6,
          );
          const runtime = runtimeRef.current;
          runtime.dragging = false;
          drag = null;
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          const stillOverObject = setPointer(event);
          canvas.style.cursor = stillOverObject ? "grab" : "default";
          runtime.targetRotY =
            runtime.manualRotY + (stillOverObject ? runtime.pointerX * 0.018 : 0);
          runtime.targetRotX =
            runtime.manualRotX - (stillOverObject ? runtime.pointerY * 0.012 : 0);
          if (wasClick) {
            runtime.angularVelocityX *= 0.4;
            runtime.angularVelocityY *= 0.4;
            toggleRef.current();
          }
        };

        const onPointerCancel = (event: PointerEvent) => {
          const runtime = runtimeRef.current;
          runtime.dragging = false;
          runtime.angularVelocityX *= 0.5;
          runtime.angularVelocityY *= 0.5;
          drag = null;
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          canvas.style.cursor = "default";
        };

        const onPointerLeave = () => {
          const runtime = runtimeRef.current;
          runtime.targetPresence = 0;
          runtime.lightTargetX = 0;
          runtime.lightTargetY = 0;
          runtime.lightTargetZ = 4.4;
          if (!runtime.dragging) {
            runtime.pointerX = 0;
            runtime.pointerY = 0;
            runtime.targetRotX = runtime.manualRotX;
            runtime.targetRotY = runtime.manualRotY;
            canvas.style.cursor = "default";
          }
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerCancel);
        canvas.addEventListener("pointerleave", onPointerLeave);

        const resize = () => {
          const bounds = wrapper.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return;
          renderer.setSize(bounds.width, bounds.height, false);
          camera.aspect = bounds.width / bounds.height;
          camera.updateProjectionMatrix();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrapper);
        resize();

        const clock = new THREE.Clock();
        const orientationEuler = new THREE.Euler(0, 0, 0, "XYZ");
        const orientationQuaternion = new THREE.Quaternion();
        let firstFrame = true;
        let pageVisible = !document.hidden;

        const advanceSpring = (
          value: number,
          velocity: number,
          target: number,
          stiffness: number,
          damping: number,
          delta: number,
        ): [number, number] => {
          let nextVelocity = velocity + (target - value) * stiffness * delta;
          nextVelocity *= Math.exp(-damping * delta);
          let nextValue = value + nextVelocity * delta;
          nextValue = THREE.MathUtils.clamp(nextValue, -0.045, 1.065);
          if (
            Math.abs(target - nextValue) < 0.00015 &&
            Math.abs(nextVelocity) < 0.0008
          ) {
            nextValue = target;
            nextVelocity = 0;
          }
          return [nextValue, nextVelocity];
        };

        const animate = () => {
          if (disposed || !pageVisible) {
            animationFrame = 0;
            return;
          }
          animationFrame = window.requestAnimationFrame(animate);

          const runtime = runtimeRef.current;
          const delta = Math.min(clock.getDelta(), 0.05);
          const elapsed = clock.elapsedTime;
          const damp = (speed: number) => 1 - Math.exp(-speed * delta);

          if (reducedMotion) {
            runtime.reveal = 1;
            runtime.openProgress = runtime.opened ? 1 : 0;
            runtime.topOpen = runtime.openProgress;
            runtime.middleOpen = runtime.openProgress;
            runtime.bottomOpen = runtime.openProgress;
            runtime.topOpenVelocity = 0;
            runtime.middleOpenVelocity = 0;
            runtime.bottomOpenVelocity = 0;
            runtime.angularVelocityX = 0;
            runtime.angularVelocityY = 0;
            runtime.releaseEnergy = 0;
            runtime.rayLagX = 0;
            runtime.rayLagY = 0;
          } else {
            runtime.reveal += (1 - runtime.reveal) * damp(2.65);
            const openTarget = runtime.opened ? 1 : 0;
            [runtime.topOpen, runtime.topOpenVelocity] = advanceSpring(
              runtime.topOpen,
              runtime.topOpenVelocity,
              openTarget,
              runtime.opened ? 38 : 30,
              runtime.opened ? 8.6 : 8.9,
              delta,
            );
            [runtime.middleOpen, runtime.middleOpenVelocity] = advanceSpring(
              runtime.middleOpen,
              runtime.middleOpenVelocity,
              openTarget,
              34,
              8.2,
              delta,
            );
            [runtime.bottomOpen, runtime.bottomOpenVelocity] = advanceSpring(
              runtime.bottomOpen,
              runtime.bottomOpenVelocity,
              openTarget,
              runtime.opened ? 30 : 38,
              runtime.opened ? 7.8 : 9.1,
              delta,
            );
            runtime.openProgress = THREE.MathUtils.clamp(
              (runtime.topOpen + runtime.middleOpen + runtime.bottomOpen) / 3,
              0,
              1,
            );

            if (!runtime.dragging) {
              const angularDamping = runtime.targetPresence < 0.04 ? 2.65 : 2.3;
              runtime.angularVelocityX *= Math.exp(-angularDamping * delta);
              runtime.angularVelocityY *= Math.exp(-angularDamping * delta);
              runtime.manualRotX += runtime.angularVelocityX * delta;
              runtime.manualRotY += runtime.angularVelocityY * delta;

              if (runtime.manualRotX < ROTATION_X_MIN) {
                runtime.manualRotX = ROTATION_X_MIN;
                runtime.angularVelocityX = Math.abs(runtime.angularVelocityX) * 0.12;
              } else if (runtime.manualRotX > ROTATION_X_MAX) {
                runtime.manualRotX = ROTATION_X_MAX;
                runtime.angularVelocityX = -Math.abs(runtime.angularVelocityX) * 0.12;
              }
              if (runtime.manualRotY < ROTATION_Y_MIN) {
                runtime.manualRotY = ROTATION_Y_MIN;
                runtime.angularVelocityY = Math.abs(runtime.angularVelocityY) * 0.12;
              } else if (runtime.manualRotY > ROTATION_Y_MAX) {
                runtime.manualRotY = ROTATION_Y_MAX;
                runtime.angularVelocityY = -Math.abs(runtime.angularVelocityY) * 0.12;
              }
              if (Math.abs(runtime.angularVelocityX) < 0.0005) {
                runtime.angularVelocityX = 0;
              }
              if (Math.abs(runtime.angularVelocityY) < 0.0005) {
                runtime.angularVelocityY = 0;
              }
            }
          }
          runtime.presence +=
            (runtime.targetPresence - runtime.presence) * damp(5.2);
          runtime.targetRotX =
            runtime.manualRotX - runtime.pointerY * runtime.presence * 0.012;
          runtime.targetRotY =
            runtime.manualRotY + runtime.pointerX * runtime.presence * 0.018;
          runtime.currentRotX +=
            (runtime.targetRotX - runtime.currentRotX) *
            damp(runtime.dragging ? 19 : 10.5);
          runtime.currentRotY +=
            (runtime.targetRotY - runtime.currentRotY) *
            damp(runtime.dragging ? 19 : 10.5);

          const revealEase = 1 - Math.pow(1 - runtime.reveal, 3);
          const openEase =
            runtime.openProgress * runtime.openProgress * (3 - 2 * runtime.openProgress);
          const openingEnergy = THREE.MathUtils.clamp(
            (Math.abs(runtime.topOpenVelocity) +
              Math.abs(runtime.middleOpenVelocity) +
              Math.abs(runtime.bottomOpenVelocity)) *
              0.24,
            0,
            1,
          );
          const angularEnergy = THREE.MathUtils.clamp(
            (Math.abs(runtime.angularVelocityX) +
              Math.abs(runtime.angularVelocityY)) *
              0.9,
            0,
            1,
          );
          const openingRelease = THREE.MathUtils.clamp(
            (Math.max(0, runtime.topOpenVelocity) +
              Math.max(0, runtime.middleOpenVelocity) +
              Math.max(0, runtime.bottomOpenVelocity)) *
              0.31,
            0,
            1,
          );
          if (!reducedMotion) {
            runtime.releaseEnergy = Math.max(
              openingRelease,
              runtime.releaseEnergy * Math.exp(-2.15 * delta),
            );
            const lagTargetX = THREE.MathUtils.clamp(
              -runtime.angularVelocityY * 0.11 -
                runtime.pointerX * runtime.presence * 0.006,
              -0.085,
              0.085,
            );
            const lagTargetY = THREE.MathUtils.clamp(
              runtime.angularVelocityX * 0.08 +
                runtime.pointerY * runtime.presence * 0.004,
              -0.06,
              0.06,
            );
            runtime.rayLagX += (lagTargetX - runtime.rayLagX) * damp(5.4);
            runtime.rayLagY += (lagTargetY - runtime.rayLagY) * damp(5.4);
          }
          const motionEnergy = THREE.MathUtils.clamp(
            openingEnergy * 0.58 +
              angularEnergy * 0.72 +
              runtime.releaseEnergy * 0.68,
            0,
            1,
          );

          topSegment.position.set(
            runtime.topOpen * 0.01,
            runtime.topOpen * 0.11,
            runtime.topOpen * 0.014,
          );
          middleSegment.position.set(
            runtime.middleOpen * -0.01,
            0,
            runtime.middleOpen * 0.032,
          );
          bottomSegment.position.set(
            runtime.bottomOpen * -0.005,
            runtime.bottomOpen * -0.11,
            runtime.bottomOpen * 0.012,
          );
          topSegment.rotation.z = runtime.topOpenVelocity * 0.0035;
          middleSegment.rotation.y = runtime.middleOpenVelocity * -0.004;
          bottomSegment.rotation.z = runtime.bottomOpenVelocity * -0.0035;

          root.scale.setScalar(0.89 + revealEase * 0.11);
          root.position.y =
            -0.16 * (1 - revealEase) +
            openEase * 0.006 +
            (reducedMotion ? 0 : Math.sin(elapsed * 0.38) * 0.0035);
          orientationEuler.set(
            runtime.currentRotX +
              (reducedMotion ? 0 : Math.sin(elapsed * 0.2) * 0.0012),
            runtime.currentRotY +
              (reducedMotion ? 0 : Math.sin(elapsed * 0.16) * 0.0024),
            0,
          );
          orientationQuaternion.setFromEuler(orientationEuler);
          root.quaternion.slerp(
            orientationQuaternion,
            reducedMotion ? 1 : damp(runtime.dragging ? 14 : 9.2),
          );

          const seamLeak = THREE.MathUtils.smoothstep(openEase, 0.002, 0.18);
          const interiorReveal = THREE.MathUtils.smoothstep(openEase, 0.018, 0.58);
          const rayReveal = runtime.opened
            ? THREE.MathUtils.smoothstep(openEase, 0.075, 0.86)
            : THREE.MathUtils.smoothstep(openEase, 0.32, 0.96);
          const whitePulse = reducedMotion
            ? 1
            : 0.99 +
              Math.sin(elapsed * 0.64) * 0.007 +
              Math.sin(elapsed * 0.23 + 1.8) * 0.003;
          const releaseFlare = 1 + runtime.releaseEnergy * 0.68;
          lumenMaterial.opacity = seamLeak * (0.82 + runtime.releaseEnergy * 0.1);
          innerShellMaterial.emissiveIntensity =
            interiorReveal * (0.58 + whitePulse * 0.18) * releaseFlare;
          innerShellMaterial.roughness = 0.21 - interiorReveal * 0.058;
          gapGlowMaterial.opacity =
            seamLeak * whitePulse * (0.25 + runtime.releaseEnergy * 0.12);
          coreHaloMaterial.opacity =
            interiorReveal *
            (modestDevice ? 0.13 : 0.18) *
            (1 + runtime.releaseEnergy * 0.68);
          coreHalo.scale.set(
            1.55 + openEase * 0.14 + runtime.releaseEnergy * 0.18,
            0.66 + openEase * 0.09 + runtime.releaseEnergy * 0.06,
            1,
          );
          interiorLight.intensity =
            interiorReveal * whitePulse * 7.7 * releaseFlare;
          spillLight.intensity =
            interiorReveal * whitePulse * 2.15 * (1 + runtime.releaseEnergy * 0.42);
          upperCutLight.intensity =
            seamLeak * whitePulse * 4.8 * (1 + runtime.releaseEnergy * 0.36);
          lowerCutLight.intensity =
            seamLeak * whitePulse * 4.8 * (1 + runtime.releaseEnergy * 0.36);
          innerSweepLightA.position.set(
            (reducedMotion ? -0.2 : Math.sin(elapsed * 0.56) * 0.31) +
              runtime.rayLagX * 1.4,
            0.13 + (reducedMotion ? 0 : Math.cos(elapsed * 0.39) * 0.18),
            0.43,
          );
          innerSweepLightB.position.set(
            (reducedMotion ? 0.22 : Math.cos(elapsed * 0.47 + 1.2) * 0.28) +
              runtime.rayLagX,
            -0.15 + (reducedMotion ? 0 : Math.sin(elapsed * 0.44 + 0.7) * 0.17),
            0.39,
          );
          innerSweepLightA.intensity =
            interiorReveal * (1.7 + runtime.releaseEnergy * 1.1);
          innerSweepLightB.intensity =
            interiorReveal * (1.35 + runtime.releaseEnergy * 0.9);
          const livingMotion = reducedMotion
            ? 0
            : THREE.MathUtils.clamp(0.13 + motionEnergy * 0.87, 0, 1);
          rayEffects.forEach((effect) => {
            const quietBreath = reducedMotion
              ? 1
              : 1 +
                Math.sin(
                  elapsed * (0.31 + effect.phase * 0.09) + effect.phase * 18,
                ) *
                  (effect.layer === 0 ? 0.014 : 0.027);
            const layerOpacity = effect.layer === 0 ? 0.15 : 0.235;
            effect.material.uniforms.uOpacity.value =
              rayReveal *
              whitePulse *
              layerOpacity *
              (modestDevice ? 0.78 : 1) *
              effect.strength *
              quietBreath *
              (1 + runtime.releaseEnergy * 0.44 + angularEnergy * 0.08);
            effect.material.uniforms.uTime.value = reducedMotion
              ? effect.phase * 10
              : elapsed + effect.phase * 10;
            effect.material.uniforms.uMotion.value = livingMotion;
            effect.material.uniforms.uRelease.value = runtime.releaseEnergy;
            const idleBend = reducedMotion
              ? 0
              : Math.sin(elapsed * 0.42 + effect.phase * 13) *
                (effect.layer === 0 ? 0.0035 : 0.007);
            effect.material.uniforms.uBend.value.set(
              rayReveal * (runtime.rayLagX + idleBend),
              rayReveal *
                (runtime.rayLagY +
                  Math.cos(elapsed * 0.36 + effect.phase * 11) *
                    (effect.layer === 0 ? 0.0025 : 0.005)),
            );
            effect.group.scale.set(
              0.7 + rayReveal * 0.3,
              0.14 +
                rayReveal *
                  (0.86 +
                    runtime.releaseEnergy * 0.09 +
                    (quietBreath - 1) * 0.8),
              0.7 + rayReveal * 0.3,
            );
          });
          moteMaterial.uniforms.uTime.value = reducedMotion ? 12 : elapsed;
          moteMaterial.uniforms.uOpacity.value =
            rayReveal *
            (modestDevice ? 0.31 : 0.43) *
            (1 + runtime.releaseEnergy * 0.52);
          moteMaterial.uniforms.uMotion.value = livingMotion;
          moteMaterial.uniforms.uRelease.value = runtime.releaseEnergy;
          faceMaterial.roughness = 0.19 - runtime.presence * 0.014;
          faceMaterial.envMapIntensity = 0.47 + runtime.presence * 0.045;
          pointerLight.position.x +=
            (runtime.lightTargetX - pointerLight.position.x) * damp(6.2);
          pointerLight.position.y +=
            (runtime.lightTargetY - pointerLight.position.y) * damp(6.2);
          pointerLight.position.z +=
            (runtime.lightTargetZ - pointerLight.position.z) * damp(6.2);
          pointerLight.intensity =
            1.8 +
            runtime.presence * 2.2 +
            Math.sin(runtime.openProgress * Math.PI) * 0.45;

          shadow.scale.set(
            1.64 + openEase * 0.12 + angularEnergy * 0.035,
            0.56 + openEase * 0.055,
            1,
          );
          shadow.position.x = runtime.currentRotY * -0.075;
          shadow.position.y =
            -1.29 + (reducedMotion ? 0 : Math.sin(elapsed * 0.38) * -0.002);
          shadowMaterial.opacity =
            0.7 - openEase * 0.16 - interiorReveal * 0.045 - angularEnergy * 0.025;
          floorSpillMaterial.opacity =
            interiorReveal *
            whitePulse *
            (modestDevice ? 0.052 : 0.078) *
            (1 + runtime.releaseEnergy * 0.62);
          floorSpill.scale.set(
            2.05 + openEase * 0.22 + runtime.releaseEnergy * 0.18,
            0.48 + openEase * 0.07,
            1,
          );
          floorSpill.position.x =
            runtime.currentRotY * -0.14 + runtime.rayLagX * -0.5;

          renderer.render(scene, camera);
          if (firstFrame) {
            firstFrame = false;
            setRenderState("ready");
          }
        };

        const onVisibilityChange = () => {
          pageVisible = !document.hidden;
          if (pageVisible && !animationFrame) {
            clock.getDelta();
            animate();
          }
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        animate();

        removeListeners = () => {
          resizeObserver.disconnect();
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerCancel);
          canvas.removeEventListener("pointerleave", onPointerLeave);
          document.removeEventListener("visibilitychange", onVisibilityChange);
          window.cancelAnimationFrame(animationFrame);
          const geometries = new Set<ThreeBufferGeometry>();
          const materials = new Set<ThreeMaterial>();
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
              geometries.add(object.geometry);
            }
            if (
              !(object instanceof THREE.Mesh) &&
              !(object instanceof THREE.Points) &&
              !(object instanceof THREE.Sprite)
            ) {
              return;
            }
            const objectMaterials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            objectMaterials.forEach((material) => materials.add(material));
          });
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          shadowTexture.dispose();
          glowTexture.dispose();
          environmentTarget.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
        };
      } catch (error) {
        console.error("Obsidian Core initialization failed", error);
        if (!disposed) setRenderState("fallback");
      }
    };

    void initialize();
    return () => {
      disposed = true;
      removeListeners();
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleRef.current();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      runtime.manualRotY = Math.max(
        ROTATION_Y_MIN,
        Math.min(
          ROTATION_Y_MAX,
          runtime.manualRotY + (event.key === "ArrowLeft" ? -0.055 : 0.055),
        ),
      );
      runtime.angularVelocityY = 0;
      runtime.targetRotY = runtime.manualRotY;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      runtime.manualRotX = Math.max(
        ROTATION_X_MIN,
        Math.min(
          ROTATION_X_MAX,
          runtime.manualRotX + (event.key === "ArrowUp" ? -0.045 : 0.045),
        ),
      );
      runtime.angularVelocityX = 0;
      runtime.targetRotX = runtime.manualRotX;
    }
    if (event.key === "Home") {
      event.preventDefault();
      runtime.manualRotX = RESTING_ROTATION_X;
      runtime.manualRotY = RESTING_ROTATION_Y;
      runtime.angularVelocityX = 0;
      runtime.angularVelocityY = 0;
      runtime.targetRotX = RESTING_ROTATION_X;
      runtime.targetRotY = RESTING_ROTATION_Y;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`monolith-scene is-${renderState} ${opened ? "is-open" : ""}`}
      tabIndex={0}
      role="button"
      aria-pressed={opened}
      aria-label={`${opened ? "Close" : "Reveal"} the Obsidian Core. Drag to inspect within a controlled range; the core remains at the released angle. Use arrow keys to rotate or Home to reset.`}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} className="monolith-canvas" aria-hidden="true" />
      <div className="monolith-loader" aria-hidden="true">
        <span /> Preparing core
      </div>
      <div className="monolith-fallback" aria-hidden="true">
        <b>OBSIDIAN CORE</b>
        <span>Interactive object unavailable</span>
      </div>
    </div>
  );
}
