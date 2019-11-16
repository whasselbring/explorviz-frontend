import Component from '@glimmer/component';
import { inject as service } from "@ember/service";
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import DS from 'ember-data';
import Procezz from 'explorviz-frontend/models/procezz';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

interface Args {
  procezz: Procezz
  errorHandling(errorArray:any): void
}

export default class ProcezzDetails extends Component<Args> {

  @service('store') store!: DS.Store;

  @tracked
  showSpinner = false;

  monitoredFlag = false;

  // @Override
  constructor(owner:any, args: Args){
    super(owner, args);
    // Save the monitoring flag on component setup
    // We can therefore use it to show a message for the user
    // (showMessageForUser)  
    const monitoredFlag = this.args.procezz.monitoredFlag;
    this.monitoredFlag = monitoredFlag; 
  }

  @action
  saveProcezz() {
    const self = this;

    if(this.args.procezz.get('hasDirtyAttributes')){
      this.showSpinner = true;

      this.args.procezz.save().then(() => {
        self.showSpinner = false;
        self.showMessageForUser(self.buildUpdateMessageForUser(true));     
      })
      .catch((errorObject:any) => {

        self.args.procezz.rollbackAttributes();

        self.args.procezz.set('errorOccured', true);
        self.args.procezz.set('errorMessage', errorObject);

        // closure action from discovery controller
        self.args.errorHandling(errorObject);
      });
    } else {
      self.showMessageForUser(self.buildUpdateMessageForUser(false));
    }
  }

  @action
  restartProcezz() {

    const self = this;

    // this attribute will trigger the agent
    // to restart the procezz
    this.args.procezz.set('restart', true);
    this.args.procezz.set('stopped', false);

    this.showSpinner = true;

    this.args.procezz.save()
    .then(() => {
      self.showSpinner = false;
      self.showMessageForUser(self.buildRestartMessageForUser());     
    })
    .catch((errorObject:any) => {
      self.args.procezz.rollbackAttributes();
      
      // closure action from discovery controller
      self.args.errorHandling(errorObject);
    });
  }

  @action
  stopProcezz() {

    const self = this;

    // this attribute will trigger the agent
    // to stop the procezz      
    this.args.procezz.set('stopped', true);
    this.args.procezz.set('restart', false);

    this.showSpinner = true;

    this.args.procezz.save()
    .then(() => {
      self.showSpinner = false;
      self.showMessageForUser("Procezz was stopped.");     
    })
    .catch((errorObject:any) => {
      self.args.procezz.rollbackAttributes();
      
      // closure action from discovery controller
      self.args.errorHandling(errorObject);
    });
  }

  buildRestartMessageForUser() {
    const mainMessage = "Procezz restarted.";
    let monitoringMessage = "";

    const monitoredFlag = this.args.procezz.get('monitoredFlag');
    const oldMonitoredFlag = this.monitoredFlag;

    if(monitoredFlag !== oldMonitoredFlag && monitoredFlag) {
      // was set from off to on
      monitoringMessage = "Monitoring was started.";
    }
    else if(monitoredFlag !== oldMonitoredFlag && !monitoredFlag) {
      // was set from on to off
      monitoringMessage = "Monitoring was stopped.";
    }

    return `${mainMessage} ${monitoringMessage}`;
  }

  buildUpdateMessageForUser(hasDirtyAttributes: boolean) {    

    let mainMessage = "No change detected.";

    if(hasDirtyAttributes) {
      mainMessage = "Procezz updated.";
    }

    return mainMessage;
  }

  showMessageForUser(message: string) {

    this.monitoredFlag = this.args.procezz.get('monitoredFlag');

    AlertifyHandler.showAlertifyMessageWithDuration(
      `${message} Click on <b>Discovery</b> to go back.`, 4);
  }

}