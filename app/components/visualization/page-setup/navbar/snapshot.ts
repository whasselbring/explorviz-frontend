import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { get, set, action } from '@ember/object';
import LandscapeRepository from 'explorviz-frontend/services/repos/landscape-repository';
import RenderingService from 'explorviz-frontend/services/rendering-service';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import DS from 'ember-data';
import debugLogger from 'ember-debug-logger';
import FileDownloader from 'explorviz-frontend/services/file-downloader';
import AlertifyHandler from 'explorviz-frontend/mixins/alertify-handler';

import $ from 'jquery';

interface ApplicationSnapshot {
  landscapeTimestamp:number
  applicationId:string
  componentStates: {
    [id: string]: boolean
  },
  highlighted: string
}

export default class VisualizationPageSetupNavbarSnapshot extends Component.extend(AlertifyHandler) {

  tagName = '';

  @service('repos/landscape-repository') landscapeRepository!: LandscapeRepository;
  @service('rendering-service') renderingService!: RenderingService;
  @service reloadHandler!: ReloadHandler;
  @service fileDownloader!: FileDownloader;
  @service('store') store!: DS.Store;

  debug = debugLogger();

  @action
  triggerImportDialog() {
    $('#snapshotUpload').click();
  }

  @action
  export(this: VisualizationPageSetupNavbarSnapshot) : void {
    let latestLandscape = get(get(this, 'landscapeRepository'), 'latestLandscape');
    let latestApplication = get(get(this, 'landscapeRepository'), 'latestApplication');

    if(latestLandscape === null) {
      this.showAlertifyError('Latest Landscape not found');
      return;
    }

    if(latestApplication === null) {
      this.showAlertifyError('Latest Application not found');
      return;
    }

    let landscapeTimestamp = get(get(latestLandscape, 'timestamp'), 'timestamp');
    let applicationId = get(latestApplication, 'id');

    let componentStates:{[id: string]: boolean} = {};
    let highlighted = '';

    let components = latestApplication.getAllComponents();
    components.forEach(component => {
      if(!component.foundation) {
        componentStates[get(component, 'id')] = get(component, 'opened');
        if(get(component, 'highlighted')) {
          highlighted = get(component, 'id');
        }
      }
    });

    let applicationSnapshot:ApplicationSnapshot = {
      landscapeTimestamp,
      applicationId,
      componentStates,
      highlighted
    };

    this.debug(`Data exported: ${JSON.stringify(applicationSnapshot)}`);
    get(this, 'fileDownloader').downloadObjectAsFile(applicationSnapshot, `snapshot-${this.create_UUID()}.expl`);
  }

  @action
  import(this: VisualizationPageSetupNavbarSnapshot, event:any) : void {    
    const reader = new FileReader();
    const file = event.target.files[0];

    reader.onload = () => {
      let readerData = reader.result;

      if(typeof readerData !== 'string') {
        this.showAlertifyError('File is not a valid Snapshot');
        return;
      }

      let parsedSnapshot;

      try {
        parsedSnapshot = JSON.parse(readerData);
      } catch(e) {
        this.showAlertifyError('File is not a valid Snapshot');
        return;
      }

      if(!this.isApplicationSnapshot(parsedSnapshot)) {
        this.showAlertifyError('File is not a valid Snapshot');
        return;
      }

      this.loadSnapshot(parsedSnapshot);
    };

    if(file) {
      reader.readAsText(file);
    }
  }

  loadSnapshot(snapshot:ApplicationSnapshot) {

    // TODO: handle asynchronicity of landscape loading and exceptions
    get(this, 'reloadHandler').loadLandscapeById(snapshot.landscapeTimestamp);

    let latestLandscape = get(get(this, 'landscapeRepository'), 'latestLandscape');

    if(latestLandscape !== null) {
      let application = get(this, 'store').peekRecord('application', snapshot.applicationId);
      if(application !== null) {
        set(get(this, 'landscapeRepository'), 'latestApplication', application);

        for (const [componentId, status] of Object.entries(snapshot.componentStates)) {
          let component = get(this, 'store').peekRecord('component', componentId);
          if(component !== null) {
            component.setOpenedStatus(status);
          }
        }

        if(snapshot.highlighted !== '') {
          let component = get(this, 'store').peekRecord('component', snapshot.highlighted);
  
          if(component !== null) {
            set(component, 'highlighted', true);
          }
        }

        get(this, 'renderingService').reSetupScene();
      }
    }
  }

  isApplicationSnapshot(x: any): x is ApplicationSnapshot {

    function areComponentStatesValid() {
      for (let [componentId, status] of Object.entries(x.componentStates)) {
        if(!(typeof componentId === 'string' && typeof status === 'boolean'))
          return false;
      }
      return true;
    }

    return typeof x === 'object' &&
           Object.keys(x).length === 4 &&
           x.hasOwnProperty('landscapeTimestamp') && typeof x.landscapeTimestamp === 'number' &&
           x.hasOwnProperty('applicationId') && typeof x.applicationId === 'string' &&
           x.hasOwnProperty('highlighted') && typeof x.highlighted === 'string' &&
           x.hasOwnProperty('componentStates') && typeof x.componentStates === 'object' && areComponentStatesValid()
  }

  create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}
};
