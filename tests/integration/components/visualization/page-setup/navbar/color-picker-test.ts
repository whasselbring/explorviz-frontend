import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

module('Integration | Component | visualization/page-setup/navbar/color-picker', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    this.set('openAllComponents', () => {});

    await render(hbs`<Visualization::PageSetup::Navbar::ColorPicker />`);

    let textContent = this.element.textContent;

    if(textContent === null) {
      assert.ok(null, 'textContent is null');
    } else {
      assert.equal(textContent.trim(), '');
    }
  });
});
