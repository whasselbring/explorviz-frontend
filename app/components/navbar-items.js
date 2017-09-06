import Ember from 'ember';

const {Component, inject} = Ember;

/**
* TODO
* 
* @class Navbar-Item-Component
* @extends Ember.Component
*/
export default Component.extend({
	tagName: "ul",

	classNames:["nav", "navbar-nav"],

	navbarService: inject.service('navbar-labels'),

  actions: {
    resetToLandscapeView() {
      this.sendAction("resetToLandscapeView");
    }
  }
});
