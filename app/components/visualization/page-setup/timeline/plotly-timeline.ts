import Component from '@ember/component';
import Plotly from 'plotly.js-dist';
import debugLogger from 'ember-debug-logger';
import Timestamp from 'explorviz-frontend/models/timestamp';

export default class PlotlyTimeline extends Component.extend({
  // anything which *must* be merged to prototype here
}) {

  debug = debugLogger();

  tagName = '';
  initDone = false;

  oldMinuteView = null;

  // BEGIN Plotly parameter (must be updated at runtime)

  plotlyData = [
    {
      hoverinfo: 'text',
      type: 'scattergl',
      x: 1, // must be updated
      y: 1, // must be updated
      hoverlabel: {
        align: "left"
      },
      text: this.hoverText([new Date()],[1]) // must be updated
    }
  ];

  plotlyLayout = {
    dragmode: 'pan', 
    yaxis: { 
      fixedrange: true
    },
    xaxis: {
      type: 'date',
      range: [1,2] // must be updated
    },
    margin: {
      b: 20,
      t: 20,
      pad: 4
    }
  };

  plotlyOptions = {
    displayModeBar: false,
    scrollZoom: true,
    responsive: true 
  };

  // END Plotly Parameter

  didRender() {
    this._super(...arguments);

    if(this.initDone) {
      this.extendPlotlyTimelineChart(this.get("timestamps"));
    } else {
      this.setupPlotlyTimelineChart(this.get("timestamps"));
    }
  };

  hoverText(x : Array<Date> ,y : Array<number>) {
    return x.map((xi, i) => `<b>Time</b>: ${xi}<br><b>Total Requests</b>: ${y[i]}<br>`);
  };

  setupPlotlyTimelineChart(timestamps : Array<Timestamp>) {

    if(!timestamps || timestamps.length == 0) {
      return;
    }

    var x : Array<Date> = [];
    var y : Array<number> = [];

    for(const timestamp of timestamps) {
      x.push(new Date(timestamp.get('timestamp')));
      y.push(timestamp.get('totalRequests'));
    }

    const data = this.get("plotlyData");
    console.log(data.get(0));
    data.get(0).x = x;
    data.get(0).y = y;
    data.get(0).text = this.hoverText(x,y);

    const latestTimestamp = timestamps.lastObject;
    const latestTimestampValue = new Date(latestTimestamp.get('timestamp'));

    const minTimestamp = latestTimestampValue.setMinutes(latestTimestampValue.getMinutes() - 1);
    const maxTimestamp = latestTimestampValue.setMinutes(latestTimestampValue.getMinutes() + 1);

    const layout = this.get("plotlyLayout");
    layout.xaxis.range = [minTimestamp,maxTimestamp];

    const options = this.get("plotlyOptions");

    Plotly.newPlot(
      'plotlyDiv',
      data, 
      layout,
      options
    );

    this.initDone = true;

  };


  extendPlotlyTimelineChart(timestamps : Array<Timestamp>) {

    if(!timestamps || timestamps.length == 0) {
      return;
    }

    var x : Array<Date> = [];
    var y : Array<number> = [];

    for(const timestamp of timestamps) {
      x.push(new Date(timestamp.get('timestamp')));
      y.push(timestamp.get('totalRequests'));
    }    

    const data = this.get("plotlyData");
    console.log(data.get(0));
    data.get(0).x = x;
    data.get(0).y = y;
    data.get(0).text = this.hoverText(x,y);

    const latestTimestamp = timestamps.lastObject;
    const latestTimestampValue = new Date(latestTimestamp.get('timestamp'));

    const minTimestamp = latestTimestampValue.setMinutes(latestTimestampValue.getMinutes() - 1);
    const maxTimestamp = latestTimestampValue.setMinutes(latestTimestampValue.getMinutes() + 1);

    const layout = this.get("plotlyLayout");
    layout.xaxis.range = [minTimestamp,maxTimestamp];

    const options = this.get("plotlyOptions");

    Plotly.react(
      'plotlyDiv',
      data, 
      layout,
      options
    );

    if(!this.get("oldMinuteView")) {
      console.log("test");
      const minuteView = {
        xaxis: {
          type: 'date',
          range: [minTimestamp,maxTimestamp]
        }        
      };
      this.set("oldMinuteView", minuteView);
    }   

    //Plotly.relayout('plotlyDiv', this.get("oldMinuteView"));
  };
  
};
