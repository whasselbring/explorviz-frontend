import { moduleForModel, test } from 'ember-qunit';

moduleForModel('clazz', 'Unit | Model | clazz', {
  // Specify the other units that are required for this test.
  needs: ['model:component']
});

test('it exists', function(assert) {
  let model = this.subject();
  // let store = this.store();
  assert.ok(!!model);
});
