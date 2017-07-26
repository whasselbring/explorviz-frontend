import Ember from 'ember';
import RenderingCore from './rendering-core';

import Raycaster from '../utils/raycaster';
import THREE from "npm:three";

import applyKlayLayout from '../utils/landscape-rendering/klay-layouter';
import Interaction from '../utils/landscape-rendering/interaction';
import Labeler from '../utils/landscape-rendering/labeler';
import CalcCenterAndZoom from
  '../utils/landscape-rendering/center-and-zoom-calculator';

import ImageLoader from '../utils/three-image-loader';

import Meshline from "npm:three.meshline";


/**
* Renderer for landscape visualization.
*
* @class Landscape-Rendering
* @extends Rendering-Core
*/
export default RenderingCore.extend({

  configuration: Ember.inject.service("configuration"),

  hammerManager: null,

  raycaster: null,
  interaction: null,
  labeler: null,
  imageLoader: null,
  centerAndZoomCalculator: null,

  openSymbol: null,
  closeSymbol: null,

  // @Override
  initRendering() {
    this._super(...arguments);

    this.debug("init landscape-rendering");

    this.onReSetupScene = function() {
      this.set('centerAndZoomCalculator.centerPoint', null);
      this.get('camera.position').set(0, 0, 0);
      this.cleanAndUpdateScene();
    };

    this.onUpdated = function() {
      if(this.get('initDone')) {
        this.cleanAndUpdateScene();
      }
    };

    this.onResized = function() {
      this.set('centerAndZoomCalculator.centerPoint', null);
      this.cleanAndUpdateScene();
    };

    if (!this.get('interaction')) {
      this.set('interaction', Interaction.create());
    }

    if (!this.get('imageLoader')) {
      this.set('imageLoader', ImageLoader.create());
    }

    if (!this.get('labeler')) {
      this.set('labeler', Labeler.create());
    }

    if (!this.get('raycaster')) {
      this.set('raycaster', Raycaster.create());
    }

    if (!this.get('centerAndZoomCalculator')) {
      this.set('centerAndZoomCalculator', CalcCenterAndZoom.create());
    }

    this.initInteraction();

    const dirLight = new THREE.DirectionalLight();
    dirLight.position.set(30, 10, 20);
    this.get('scene').add(dirLight);

    // set default model
    this.set('imageLoader.logos', {});
    this.set('labeler.textLabels', {});
    this.set('labeler.systemTextCache', []);
    this.set('labeler.nodeTextCache', []);
    this.set('labeler.appTextCache', []);

    this.set('centerAndZoomCalculator.centerPoint', null);

  },

  // @Override
  cleanup() {
    this._super(...arguments);

    this.debug("cleanup landscape rendering");

    this.set('imageLoader.logos', {});
    this.set('labeler.textLabels', {});
    this.set('labeler.textCache', []);

    this.get('interaction').off('redrawScene');
    this.get('interaction').off('showApplication');

    this.get('interaction').removeHandlers();
  },

  // @Override
  cleanAndUpdateScene() {
    this._super(...arguments);

    this.debug("clean and populate landscape rendering");

    this.populateScene();

    this.set('interaction.raycastObjects', this.get('scene.children'));
  },

  // @Override
  populateScene() {
    this._super(...arguments);

    const self = this;

    const emberLandscape = this.get('landscapeRepo.latestLandscape');

    if(!emberLandscape || !this.get('font')) {
      return;
    }

    applyKlayLayout(emberLandscape);

    const systems = emberLandscape.get('systems');

    const scaleFactor = {
      width: 0.5,
      height: 0.5
    };

    let isRequestObject = false;


    // create plus or minus, if not already done
    if(!(this.get('openSymbol') && this.get('closeSymbol')) &&
      this.get('font')) {

      createCollapseSymbols();

    }

    if (systems) {

      // calculate new center and update zoom
      if(!this.get('centerAndZoomCalculator.centerPoint')) {
        this.get('centerAndZoomCalculator')
          .calculateLandscapeCenterAndZZoom(emberLandscape,
            this.get('webglrenderer'));

        if(!this.get('viewImporter.importedURL')) {
          const cameraZ = this.get('centerAndZoomCalculator.cameraZ');
          this.set('camera.position.z', cameraZ);
          this.get('camera').updateProjectionMatrix();
        }

      }

      var centerPoint = this.get('centerAndZoomCalculator.centerPoint');


      systems.forEach(function(system) {

        isRequestObject = false;

        if (!isRequestObject && system.get('name') === "Requests") {
          isRequestObject = true;
        }

        if (!isRequestObject) {

          var extensionX = system.get('width') * scaleFactor.width;
          var extensionY = system.get('height') * scaleFactor.height;

          var centerX = system.get('positionX') + extensionX - centerPoint.x;
          var centerY = system.get('positionY') - extensionY - centerPoint.y;

          var systemMesh = createPlane(system);
          systemMesh.position.set(centerX, centerY, system.get('positionZ'));
          self.get('scene').add(systemMesh);
          system.set('threeJSModel', systemMesh);

          const textColor =
            self.get('configuration.landscapeColors.textsystem');

          self.get('labeler').saveTextForLabeling(null, systemMesh, textColor);


        }

        const nodegroups = system.get('nodegroups');

        nodegroups.forEach(function(nodegroup) {

          if(!nodegroup.get('visible')) {
              return;
            }

          if (!isRequestObject) {

            extensionX = nodegroup.get('width') * scaleFactor.width;
            extensionY = nodegroup.get('height') * scaleFactor.height;

            centerX = nodegroup.get('positionX') + extensionX - centerPoint.x;
            centerY = nodegroup.get('positionY') - extensionY - centerPoint.y;

            var nodegroupMesh = createPlane(nodegroup);
            nodegroupMesh.position.set(centerX, centerY,
              nodegroup.get('positionZ') + 0.001);

            // add respective open / close symbol
            nodegroupMesh.geometry.computeBoundingBox();
            const bboxNodegroup = nodegroupMesh.geometry.boundingBox;

            let collapseSymbol = null;

            if(nodegroup.get('opened')) {
              if(self.get('closeSymbol')) {
                collapseSymbol = self.get('closeSymbol').clone();
              }
            } else {
              if(self.get('openSymbol')) {
                collapseSymbol = self.get('openSymbol').clone();
              }
            }

            if(collapseSymbol) {
              collapseSymbol.position.x = bboxNodegroup.max.x - 0.35;
              collapseSymbol.position.y = bboxNodegroup.max.y - 0.35;
              collapseSymbol.position.z = nodegroupMesh.position.z + 0.0001;
              nodegroupMesh.add(collapseSymbol);
            }

            self.get('scene').add(nodegroupMesh);
            nodegroup.set('threeJSModel', nodegroupMesh);

          }

          const nodes = nodegroup.get('nodes');

          nodes.forEach(function(node) {

            if(!node.get('visible')) {
              return;
            }

            if (!isRequestObject) {

              extensionX = node.get('width') * scaleFactor.width;
              extensionY = node.get('height') * scaleFactor.height;

              centerX = node.get('positionX') + extensionX - centerPoint.x;
              centerY = node.get('positionY') - extensionY - centerPoint.y;

              var nodeMesh = createPlane(node);
              nodeMesh.position.set(centerX, centerY, node.get('positionZ') +
                0.002);

              self.get('scene').add(nodeMesh);
              node.set('threeJSModel', nodeMesh);

            }



            const applications = node.get('applications');


            applications.forEach(function(application) {

              extensionX = application.get('width') * scaleFactor.width;
              extensionY = application.get('height') * scaleFactor.width;

              centerX = application.get('positionX') + extensionX -
                centerPoint.x;

              centerY = application.get('positionY') - extensionY -
                centerPoint.y;

              if (!isRequestObject) {

                var applicationMesh = createPlane(application);

                applicationMesh.position.set(centerX, centerY,
                  application.get('positionZ') + 0.003);

                self.get('scene').add(applicationMesh);
                application.set('threeJSModel', applicationMesh);

                // create logos

                applicationMesh.geometry.computeBoundingBox();

                const logoSize = {
                  width: 0.4,
                  height: 0.4
                };
                const appBBox = applicationMesh.geometry.boundingBox;

                const logoPos = {
                  x: 0,
                  y: 0,
                  z: 0
                };

                const logoRightPadding = logoSize.width * 0.7;

                logoPos.x = appBBox.max.x - logoRightPadding;

                const texturePartialPath = application.get('database') ?
                  'database2' : application.get('programmingLanguage')
                    .toLowerCase();

                self.get('imageLoader').createPicture(logoPos.x, logoPos.y,
                  logoPos.z, logoSize.width, logoSize.height,
                  texturePartialPath, applicationMesh, "label");

                // create text labels

                let textColor =
                  self.get('configuration.landscapeColors.textapp');

                self.get('labeler').saveTextForLabeling(null, applicationMesh,
                  textColor);

                textColor = self.get('configuration.landscapeColors.textnode');
                self.get('labeler').saveTextForLabeling(node.getDisplayName(),
                  nodeMesh, textColor);

              } else {
                // draw request logo
                self.get('imageLoader').createPicture(centerX, centerY, 0,
                  1.6, 1.6, "requests", self.get('scene'), "label");
              }

            });

          });

        });

      });
    } // END if(systems)

    self.set('configuration.landscapeColors.textchanged', false);

    const appCommunication = emberLandscape.get('applicationCommunication');

    const tiles = [];

    let tile;

    if (appCommunication) {

      const color = self.get('configuration.landscapeColors.communication');

      appCommunication.forEach((communication) => {

        const points = communication.get('points');

        if (points.length > 0) {

          for (var i = 1; i < points.length; i++) {

            const lastPoint = points[i - 1];
            const thisPoint = points[i];

      			let tileWay = {
      				startPoint: lastPoint,
      				endPoint: thisPoint
      			};

      			let id = tiles.findIndex(isSameTile, tileWay);


      			if(id !== -1){
      				tile = tiles[id];
      			}
            else{
      				id = tiles.length; // Gets a new index

      				tile = {
      					startPoint: lastPoint,
      					endPoint: thisPoint,
      					positionZ: 0.0025,
      					requestsCache: 0,
      					communications: [],
      					pipeColor: new THREE.Color(color)
      				};

      				tiles.push(tile);
      			}

            tile.communications.push(appCommunication);
            tile.requestsCache = tile.requestsCache +
              communication.get('requests');

      			tiles[id] = tile;
          }

        }

      });


      addCommunicationLineDrawing(tiles, self.get('scene'));

    }


    // Helper functions //

    function createCollapseSymbols() {

      const material = new THREE.MeshBasicMaterial({
        color: self.get('configuration.landscapeColors.collapseSymbol')
      });


      // plus symbol

      const labelGeoOpen = new THREE.TextBufferGeometry("+", {
        font: self.get('font'),
        size: 0.35,
        height: 0
      });

      const labelMeshOpen = new THREE.Mesh(labelGeoOpen, material);
      self.set('openSymbol', labelMeshOpen);

      // minus symbol

      const labelGeoClose = new THREE.TextBufferGeometry("-", {
        font: self.get('font'),
        size: 0.35,
        height: 0
      });

      const labelMeshClose = new THREE.Mesh(labelGeoClose, material);
      self.set('closeSymbol', labelMeshClose);
    }

  	// This function is only neccessary to find the right index
  	function isSameTile(tile){
  		return checkEqualityOfPoints(this.endPoint, tile.endPoint) &&
        checkEqualityOfPoints(this.startPoint, tile.startPoint);
  	}

  	function isNextTile(newTile){
  		return checkEqualityOfPoints(newTile.startPoint, this.endPoint);
  	}

    function addCommunicationLineDrawing(tiles, parent) {

      const requestsList = {};

  	  tiles.forEach((tile) => {
        requestsList[tile.requestsCache] = 0;
  		});

      const categories = getCategories(requestsList, true);

  	  for (let i = 0; i < tiles.length; i++) {
  			let tile = tiles[i];
  			tile.lineThickness = 0.7 * categories[tile.requestsCache] + 0.1;
  		}

    	for (let i = 0; i < tiles.length; i++) {
            let tile = tiles[i];
    		createLine(tile, tiles, parent);
    	}


      function getCategories(list, linear) {

        if (linear) {
          useLinear(list);
        }
        else {
		      useThreshholds(list);
		    }

        return list;

        // inner helper functions

        function useThreshholds(list) {
          let max = 1;

          for(let request in list) {
            request = parseInt(request);
			max = (request > max) ? request : max;
          }

          const oneStep = max / 3.0;

          const t1 = oneStep;
          const t2 = oneStep * 2;

          for(let request in list){
            let categoryValue = getCategoryFromValues(request, t1, t2);
            list[request] = categoryValue;
          }

        }


        function getCategoryFromValues(value, t1, t2) {
		  value = parseInt(value);
          if (value === 0) {
            return 0.0;
          } else if (value === 1) {
            return 1.0;
          }

          if (value <= t1) {
            return 2.0;
          } else if (value <= t2) {
            return 3.0;
          } else {
            return 4.0;
          }
        }

/*
        function useLinear(list) {
          let max = 1;
          let secondMax = 1;

          for(let request in list){
      		  request = parseInt(request);
              secondMax = (request > max) ? max : secondMax;
              max = (request > max) ? request: max;
      		}
          const oneStep = secondMax / 4.0;
          const t1 = oneStep;
          const t2 = oneStep * 2;
          const t3 = oneStep * 3;

         for(let requests in list){
            let categoryValue = getCategoryFromLinearValues(requests, t1, t2,
              t3);

            list[requests] = categoryValue;
          }

        }


        function getCategoryFromLinearValues(value, t1, t2, t3) {
			value = parseInt(value);
          if (value <= 0) {
            return 0;
          } else if (value <= t1) {
            return 1.5;
          } else if (value <= t2) {
            return 2.5;
          } else if (value <= t3) {
            return 4.0;
          } else {
            return 6.5;
          }
        }
        */

        function useLinear(list) {
          let max = 1;

          for(let request in list){
            request = parseInt(request);
              max = (request > max) ? request: max;
          }

         for(let requests in list){
           let help = parseInt(requests);
            list[requests] = help/max;
          }

        }

      } // END getCategories

    } // END addCommunicationLineDrawing


    function checkEqualityOfPoints(p1, p2) {
      let x = Math.abs(p1.x - p2.x) <= 0.01;
      let y = Math.abs(p1.y - p2.y) <= 0.01;

      return (x && y);
    }



    function createLine(tile, tiles, parent) {
		  const resolution =
        new THREE.Vector2(window.innerWidth, window.innerHeight);

      const material = new Meshline.MeshLineMaterial({
        color: tile.pipeColor,
        lineWidth: tile.lineThickness * 0.4,
	      sizeAttenuation : 1,
	      resolution: resolution
      });

      const geometry = new THREE.Geometry();

      geometry.vertices.push(
        new THREE.Vector3(tile.startPoint.x - centerPoint.x,
          tile.startPoint.y - centerPoint.y, tile.positionZ)
      );

	    geometry.vertices.push(
        new THREE.Vector3(tile.endPoint.x - centerPoint.x,
          tile.endPoint.y - centerPoint.y, tile.positionZ)
      );

		  const followingTiles = tiles.filter(isNextTile, tile);
  		const length = followingTiles.length;


  		for(let i = 0; i < length; i++){
  			let followingTile = followingTiles[i];
  			createGoodEdges(tile, followingTile,  parent);
  		}

      const line = new Meshline.MeshLine();
      line.setGeometry(geometry);

      var lineMesh = new THREE.Mesh(line.geometry, material);

      parent.add(lineMesh);


		  //----------Helper functions
  		function createGoodEdges(firstTile, secondTile, parent){

  			const resolution = new THREE.Vector2(window.innerWidth,
          window.innerHeight);

        let lineThickness =
        (firstTile.lineThickness < secondTile.lineThickness) ?
          firstTile.lineThickness : secondTile.lineThickness;

  			const material = new Meshline.MeshLineMaterial({
  				color: secondTile.pipeColor,
  				lineWidth: lineThickness * 0.4,
  				sizeAttenuation : 1,
  				resolution: resolution
  			});

  			let geometry = new THREE.Geometry();

  			geometry.vertices.push(
  				new THREE.Vector3(firstTile.startPoint.x - centerPoint.x,
  				firstTile.startPoint.y - centerPoint.y, firstTile.positionZ)
  			);

  			geometry.vertices.push(
  				new THREE.Vector3(firstTile.endPoint.x - centerPoint.x,
  				firstTile.endPoint.y - centerPoint.y, firstTile.positionZ)
  			);

  			geometry.vertices.push(
  				new THREE.Vector3(secondTile.endPoint.x - centerPoint.x,
  				secondTile.endPoint.y - centerPoint.y, secondTile.positionZ)
  			);


  			const line = new Meshline.MeshLine();
  			line.setGeometry(geometry);

  			var lineMesh = new THREE.Mesh(line.geometry, material);

  			parent.add(lineMesh);

		  }

    } // END createLine


    function createPlane(model) {

      const emberModelName = model.constructor.modelName;

      const material = new THREE.MeshBasicMaterial({
        color: self.get('configuration.landscapeColors.' + emberModelName)
      });

      const plane = new THREE.Mesh(new THREE.PlaneGeometry(model.get('width'),
        model.get('height')), material);

      plane.userData['model'] = model;
      return plane;

    }

    this.get('labeler').drawTextLabels(self.get('font'),
      self.get('configuration'));


  }, // END populateScene

  initInteraction() {

    const self = this;

    const canvas = this.get('canvas');
    const raycastObjects = this.get('scene').children;
    const camera = this.get('camera');
    const webglrenderer = this.get('webglrenderer');
    const raycaster = this.get('raycaster');

    // init interaction objects

    this.get('interaction').setupInteraction(canvas, camera, webglrenderer,
      raycaster, raycastObjects);

    // set listeners

    this.get('interaction').on('redrawScene', function() {
      self.cleanAndUpdateScene();
    });

    this.get('interaction').on('showApplication', function(emberModel) {
      self.set('viewImporter.importedURL', null);
      self.set('landscapeRepo.latestApplication', emberModel);
    });



  }, // END initInteraction


  // ONLY FOR DEBUGGIN
  debugPlane(x, y, z, width, height, color1, parent) {

    const material = new THREE.MeshBasicMaterial({
      color: color1,
      opacity: 0.4,
      transparent: true
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      material);

    plane.position.set(x, y, z);
    parent.add(plane);

  }





});
