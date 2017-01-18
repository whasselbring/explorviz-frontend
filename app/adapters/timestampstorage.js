import DS from 'ember-data';
import DataAdapterMixin from 'ember-simple-auth/mixins/data-adapter-mixin';

const { JSONAPIAdapter } = DS;

export default JSONAPIAdapter.extend(DataAdapterMixin, {

  authorizer: 'authorizers:authorizers',

  host: 'http://192.168.48.180:8080',
  //host: 'http://localhost:8080',

  headers: {
    "Accept": "application/json"
  },

  /*
   urlForFindRecord(timestamp, modelName) {
   let baseUrl = this.buildURL();
   return `${baseUrl}/${modelName}/${timestamp}`;
   },
   */

  urlForFindAll(modelName) {
    let baseUrl = this.buildURL();
    return `${baseUrl}/timestamp/show-timestamps`;
  }

});
