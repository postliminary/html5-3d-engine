  var Transform3D = {
      translate: function(p, t) {
          return [p[0] + t[0], p[1] + t[1], p[2] + t[2]];
      },
      rotate: function(p, r) {
          var rotX = r[0] || 0;
          var rotY = r[1] || 0;
          var rotZ = r[2] || 0;

          //Shortcut
          if (rotX == 0 && rotY == 0 && rotZ == 0) {
              return p;
          } else {
              var rotKey = "" + rotX + rotY + rotZ;
              var rot = Transform3D.rotCache[rotKey] || Transform3D.getRotation(rotX, rotY, rotZ);

              return [
                  rot[0][0] * p[0] + rot[0][1] * p[1] + rot[0][2] * p[2],
                  rot[1][0] * p[0] + rot[1][1] * p[1] + rot[1][2] * p[2],
                  rot[2][0] * p[0] + rot[2][1] * p[1] + rot[2][2] * p[2],
              ];
          }
      },
      getRotation: function(xA, yA, zA) {
          return [
              [
                  Math.cos(yA) * Math.cos(zA), -1 * Math.cos(xA) * Math.sin(zA) + Math.sin(xA) * Math.sin(yA) * Math.cos(zA),
                  Math.sin(xA) * Math.sin(zA) + Math.cos(xA) * Math.sin(yA) * Math.cos(zA)
              ],
              [
                  Math.cos(yA) * Math.sin(zA),
                  Math.cos(xA) * Math.cos(zA) + Math.sin(xA) * Math.sin(yA) * Math.sin(zA), -1 * Math.sin(xA) * Math.cos(zA) + Math.cos(xA) * Math.sin(yA) * Math.sin(zA)
              ],
              [-1 * Math.sin(yA),
                  Math.sin(xA) * Math.cos(yA),
                  Math.cos(xA) * Math.cos(yA)
              ]
          ];
      },
      rotCache: {}
  }

   //Point object
  function Point(x, y, z) {
      if (this instanceof Point) {
          this.x = x || 0;
          this.y = y || 0;
          this.z = z || 0;
          this.x2 = 0;
          this.y2 = 0;
      } else {
          return new Point(x, y, z);
      }
  }

   //Path instance methods
  Point.prototype = {
      toArray: function() {
          return [this.x, this.y, this.z];
      }
  };

   //Path static methods
  Point.fromArray = function(arr) {
      return Point(arr[0] || 0, arr[1] || 0, arr[2] || 0);
  };

   //Path object
  function Path(p1, p2) {
      if (this instanceof Path) {
          this.points = [];
          if (p1) {
              this.addPoint(p1);
          }
          if (p2) {
              this.addPoint(p2);
          }
          this.color = "#AAAAAA";
          this.fill = false;
      } else {
          return new Path(p1, p2);
      }
  }

   //Path instance methods
  Path.prototype = {
      addPoint: function(p) {
          this.points[this.points.length] = p;
      },
      toArray: function() {
          var arr = [];

          for (var i = 0; i < this.points.length; i++) {
              arr[i] = this.points[i].toArray();
          }

          return arr;
      },
      render: function(context) {
          context.beginPath();
          context.strokeStyle = this.color;

          for (var i = 0; i < this.points.length; i++) {
              context.lineTo(this.points[i].x2, this.points[i].y2);
          }

          if (this.fill) {
              context.fillStyle = this.fill;
              //No path fill until z-index figured out
              //context.fill();
          }

          context.stroke();
      }
  };

   //Path static methods
  Path.fromArray = function(arr) {
      var path = Path();

      for (var i = 0; i < arr.length; i++) {
          path.addPoint(Point.fromArray(arr[i]));
      }

      return path;
  };

   //Triangle path generator
  /*
          p2 +
            / \
           /   \
          /     \
      p1 +-------+ p3
  */
  function TriPoly(p1, p2, p3) {
      p1 = p1 || Point(-1, 0, 0);
      p2 = p2 || Point(0, 1, 0);
      p3 = p3 || Point(1, 0, 0);

      var path = Path(p1, p2);
      path.addPoint(p3);
      path.addPoint(p1);

      return path;
  }

   //Quadrilateral path generator
  /*
      p1 +----------+ p2
         |          |
         |          |
         |          |
      p4 +----------+ p3
  */
  function QuadPoly(p1, p2, p3, p4) {
      p1 = p1 || Point(-1, 1, 0);
      p2 = p2 || Point(1, 1, 0);
      p3 = p3 || Point(1, 0, 0);
      p4 = p4 || Point(-1, 0, 0);

      var path = Path(p1, p2);
      path.addPoint(p3);
      path.addPoint(p4);
      path.addPoint(p1);

      return path;
  }

   //Line
  function Line(path, pos) {
      if (this instanceof Line) {
          this.path = path || Path();
          this.pos = pos || Point();
      } else {
          return new Line(pos, path)
      }
  }

  Line.prototype = {
      addPoint: function(p) {
          this.path.addPoint(p);
      },
      getPaths: function() {
          var arr = this.path.toArray();

          for (var i = 0; i < arr.length; i++) {
              //Add position vector
              arr[i][0] = arr[i][0] + this.pos.x;
              arr[i][1] = arr[i][1] + this.pos.y;
              arr[i][2] = arr[i][2] + this.pos.z;
          }

          return [Path.fromArray(arr)];
      },
      move: function(p) {
          this.pos = p;
      }
  };

   //Shape
  function Shape(paths, pos) {
      if (this instanceof Shape) {
          this.paths = paths || [];
          this.pos = pos || Point();
          this.rot = [0, 0, 0];
          this.stroke = "#AAAAAA";
          this.fill = "#333333";
      } else {
          return new Shape(paths, pos);
      }
  }

  Shape.prototype = {
      addPath: function(p) {
          this.paths[this.paths.length] = p;
      },
      getPaths: function() {
          var pathArr = [];
          var pointArr = [];
          var point;
          var path;

          for (var i = 0; i < this.paths.length; i++) {
              pointArr = this.paths[i].toArray();

              for (var j = 0; j < pointArr.length; j++) {
                  point = pointArr[j];

                  //Rotate locally
                  //point = Transform3D.rotate(point, this.rot);
                  //Add position vector
                  point = [point[0] + this.pos.x, point[1] + this.pos.y, point[2] + this.pos.z];

                  pointArr[j] = point;
              }

              path = Path.fromArray(pointArr);
              //path.fill = this.fill;

              pathArr[pathArr.length] = path;
          }

          //Reset rot after applied (persistant rot)
          //this.rot = [0, 0, 0];

          return pathArr;
      },
      move: function(p) {
          this.pos = p;
      },
      rotate: function(x, y, z) {
          var path;
          var point;

          //Save as last rot
          this.rot = [x || 0, y || 0, z || 0];

          //Apply rotation (persistant rot)
          for (var i = 0; i < this.paths.length; i++) {
              path = this.paths[i];

              for (var j = 0; j < path.points.length; j++) {
                  point = path.points[j];

                  //Rotate locally
                  point = Point.fromArray(Transform3D.rotate(point.toArray(), this.rot));

                  path.points[j] = point;
              }
          }
      }
  };

   //Helper function easy creation of cubes
  /*
         5 +----------+ 6
          /|         /|
         / |        / |
      1 +----------+ 2|  h
        |  |       |  |
        |8 +-------|--+ 7
        | /        | /
        |/         |/   l
      4 +----------+ 3
              w
  */
  function Cube(w, l, h) {
      //Default position
      var pos = Point();
      //defaultEdge
      var defaultEdge = 10;
      //Local origin translation
      var x = w * 0.5 || defaultEdge * 0.5;
      var y = h * 0.5 || defaultEdge * 0.5;
      var z = l * 0.5 || defaultEdge * 0.5;
      //Generate points
      var p1 = Point(-x, y, -z);
      var p2 = Point(x, y, -z);
      var p3 = Point(x, -y, -z);
      var p4 = Point(-x, -y, -z);
      var p5 = Point(-x, y, z);
      var p6 = Point(x, y, z);
      var p7 = Point(x, -y, z);
      var p8 = Point(-x, -y, z);
      //Make and add polys
      var side1 = QuadPoly(p1, p2, p3, p4);
      var side2 = QuadPoly(p5, p6, p7, p8);
      var side3 = QuadPoly(p1, p5, p8, p4);
      var side4 = QuadPoly(p2, p6, p7, p3);
      var side6 = QuadPoly(p1, p5, p6, p2);
      var side5 = QuadPoly(p4, p8, p7, p3);
      var polys = [side1, side2, side3, side4, side5, side6];
      //Create shape
      return Shape(polys, pos);
  }

   //Mouse object
  function Mouse(element) {
      if (this instanceof Mouse) {
          this.trackObj = element || document;
          this.posX = 0;
          this.posY = 0;
          this.relX = element.width / 2;
          this.relY = element.height / 2;

          var mouse = this;
          this.trackObj.onmousemove = this.trackObj.ontouchmove = function(ev) {
              if (ev.touches != null) {
                  mouse.posX = mouse.relX - ev.touches[0].layerX;
                  mouse.posY = mouse.relY - ev.touches[0].layerY;
              } else {
                  mouse.posX = mouse.relX - ev.layerX;
                  mouse.posY = mouse.relY - ev.layerY;
              }
          }
      } else {
          return new Mouse(element);
      }
  }

  Mouse.prototype = {
      mouseMove: function(ev) {
          if (ev.touches != null) {
              this.posX = ev.touches[0].layerX;
              this.posY = ev.touches[0].layerY;
          } else {
              this.posX = ev.layerX;
              this.posY = ev.layerY;
          }
      }
  };

   //Camera object
  function Camera() {
      if (this instanceof Camera) {
          this.pos = Point();
          this.rot = [0, 0, 0];
      } else {
          return new Camera();
      }
  }

  Camera.prototype = {
      MAX_ROT: Math.PI * 0.1,
      rotate: function(x, y, z) {
          this.rot = [x, y, z];
      },
      transformPath: function(p) {
          this.pos = new Point(p.x, p.y, p.z);
      }
  };

   //Scene container holds shapes and camera
  function Scene(canvas) {
      if (this instanceof Scene) {
          this.context = canvas.getContext("2d");
          this.mouse = Mouse(canvas);
          this.camera = Camera();
          this.sceneWidth = canvas.width;
          this.sceneHeight = canvas.height;
          this.items = [];
          this.pathBatch = [];
          this.mutex = 1;
      } else {
          return new Scene(canvas);
      }
  }

  Scene.prototype = {
      focalLength: 700,
      addItem: function(s) {
          this.items[this.items.length] = s;
      },
      update: function() {
          var halfWidth = this.sceneWidth * 0.5;
          var halfHeight = this.sceneHeight * 0.5;
          var path;
          var point;
          var scale;

          //Capture mouse position as camera rotation
          var cameraRotX = (this.mouse.posX / this.sceneWidth) * this.camera.MAX_ROT;
          var cameraRotY = (-1.0 * this.mouse.posY / this.sceneHeight) * this.camera.MAX_ROT;
          this.camera.rotate(cameraRotY, cameraRotX, 0);

          for (var i = 0; i < this.items.length; i++) {
              this.pathBatch = this.pathBatch.concat(this.items[i].getPaths());
          }

          for (var i = 0; i < this.pathBatch.length; i++) {
              path = this.pathBatch[i];

              for (var j = 0; j < path.points.length; j++) {
                  point = path.points[j];
                  //Translate position in relation to camera
                  point = Transform3D.translate(point.toArray(), this.camera.pos.toArray());
                  //Rotation scene according to camera rotation
                  point = Transform3D.rotate(point, this.camera.rot);
                  //Back to point object
                  point = Point.fromArray(point);
                  //Scale according to camera
                  scale = this.focalLength / (point.z + this.focalLength);

                  point.x2 = point.x * scale + halfWidth;
                  point.y2 = point.y * scale + halfHeight;

                  path.points[j] = point;
              }
          }
      },
      render: function() {
          this.context.save();
          this.context.fillStyle = "#000000";
          this.context.fillRect(0, 0, this.sceneWidth, this.sceneHeight);

          for (var i = 0; i < this.pathBatch.length; i++) {
              this.pathBatch[i].render(this.context);
          }

          this.context.restore();

          this.pathBatch = [];
      },
      nextFrame: function() {
          switch (this.mutex) {
              case 1:
                  this.mutex = 0;
                  this.update();
                  this.mutex = 2;
                  break;
              case 2:
                  this.mutex = 0;
                  this.render();
                  this.mutex = 1;
                  break;
              default:
                  break;
          }
      }
  };

   //Engine container object
  function Engine3D(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.scene = Scene(this.canvas);
  }

  Engine3D.prototype = {
      frameRate: 30,
      canvas: null,
      scene: null,
      start: function() {
          var engine = this;
          setInterval(function() {
              engine.scene.nextFrame();
          }, engine.frameRate);
      },
  }

   //Test method
  function engineTest(id) {
      var engine = new Engine3D(id);

      var cube = Cube();
      cube.move(Point(0, 0, -900));
      cube.rotate(90, 90, 0);

      setInterval(function() {
          cube.rotate(0, 0.1, 0);
      }, 100);

      engine.scene.addItem(cube);

      engine.start();
  }