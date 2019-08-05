import Service from '@ember/service';
import FileSaverMixin from 'ember-cli-file-saver/mixins/file-saver';

export default class FileDownloader extends Service.extend(FileSaverMixin, {
  
  downloadObjectAsFile(object, savedFileName) {
    this.saveTextAs(savedFileName, JSON.stringify(object));
  }
}) {}