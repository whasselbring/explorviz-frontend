import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, action } from '@ember/object';
import LandscapeRepository from 'explorviz-frontend/services/repos/landscape-repository';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import DS from 'ember-data';
import debugLogger from 'ember-debug-logger';

interface ApplicationSnapshot {
  landscapeTimestamp:number
  applicationId:string
  componentStates: {
    [id: string]: boolean
  },
  highlighted: string
}

export default class VisualizationPageSetupNavbarSnapshot extends Component.extend({
  // anything which *must* be merged to prototype here
}) {

  tagName = '';

  @service('repos/landscape-repository') landscapeRepository!: LandscapeRepository;
  @service('rendering-service') renderingService!: RenderingService;
  @service reloadHandler!: ReloadHandler;
  @service('store') store!: DS.Store;

  time:number = 0;
  data:any = null;
  debug = debugLogger();

  @action
  export(this: VisualizationPageSetupNavbarSnapshot) : void {
    let latestLandscape = get(get(this, 'landscapeRepository'), 'latestLandscape');
    let latestApplication = get(get(this, 'landscapeRepository'), 'latestApplication');

    if(latestLandscape === null) {
      this.debug('Latest Landscape not found');
      return;
    }

    if(latestApplication === null) {
      this.debug('Latest Application not found');
      return;
    }

    let landscapeTimestamp = get(get(latestLandscape, 'timestamp'), 'timestamp');
    let applicationId = get(latestApplication, 'id');

    let componentStates:{[id: string]: boolean} = {};
    let highlighted = '';

    let components = latestApplication.getAllComponents();
    components.forEach(component => {
      if(!component.foundation) {
        componentStates[component.get('id')] = component.get('opened');
        if(component.get('highlighted')) {
          highlighted = component.get('id');
        }
      }
    });

    let applicationSnapshot:ApplicationSnapshot = {
      landscapeTimestamp,
      applicationId,
      componentStates,
      highlighted
    };

    this.set('data', applicationSnapshot);
    this.debug(this.get('data'));
  }

  @action
  import(this: VisualizationPageSetupNavbarSnapshot) : void {
    let data = this.get('data');

    if(data === null) {
      this.debug('Data is null');
      return;
    }

    if(!this.isApplicationSnapshot(data)) {
      this.debug('Data not valid');
      return;
    }

    // TODO: handle asynchronicity of landscape loading
    this.get('reloadHandler').loadLandscapeById(data.landscapeTimestamp);

    let latestLandscape = get(get(this, 'landscapeRepository'), 'latestLandscape');
    
    if(latestLandscape !== null) {
      let application = this.get('store').peekRecord('application', data.applicationId);
      if(application !== null) {
        this.get('landscapeRepository').set('latestApplication', application);

        for (const [componentID, value] of Object.entries(data.componentStates)) {
          let component = this.get('store').peekRecord('component', componentID);
          if(component !== null) {
            component.setOpenedStatus(value);
          }
        }
        
        let component = this.get('store').peekRecord('component', data.highlighted);

        if(component !== null) {
          component.set('highlighted', true);
        }

        this.get('renderingService').reSetupScene();
      }
    }
  }

  isApplicationSnapshot(x: any): x is ApplicationSnapshot {
    // TODO
    return true;
  }
};
