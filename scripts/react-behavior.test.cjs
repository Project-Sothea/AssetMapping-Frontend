const assert = require('node:assert/strict');
const test = require('node:test');

const React = require('react');
const { act, create } = require('react-test-renderer');

const { fixture } = require('./test-support/local-fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const native = {
  ScrollView: 'ScrollView',
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Image: 'Image',
  Pressable: 'Pressable',
  TextInput: 'TextInput',
  Alert: { alert() {} },
  StyleSheet: { create: (styles) => styles },
};
function componentFixture(t, overrides = {}) {
  const f = fixture(':memory:', {
    overrides: {
      'react-native': native,
      '@expo/vector-icons': { MaterialIcons: 'Icon' },
      ...overrides,
    },
  });
  t.after(f.close);
  return f;
}
function editorFixture(t, createForm, options = {}) {
  let general;
  let closes = 0;
  const f = componentFixture(t, {
    '../hooks/useCreateForm': { useCreateForm: () => ({ createFormAsync: createForm }) },
    '../hooks/useUpdateForm': {
      useUpdateForm: () => ({ updateFormAsync: options.updateForm ?? (async () => {}) }),
    },
    '../hooks/useDeleteForm': { useDeleteForm: () => ({ deleteFormAsync: async () => {} }) },
    '~/shared/components/ui/Spacer': { __esModule: true, default: () => null },
    '~/shared/utils/errorHandling': { ErrorHandler: { handle: (error) => error, showAlert() {} } },
    './GeneralSection': {
      __esModule: true,
      default: (props) => {
        if (!props.mode) general = props;
        return null;
      },
    },
    './EducationSection': { __esModule: true, default: () => null },
    './HealthSection': { __esModule: true, default: () => null },
    './WaterSection': { __esModule: true, default: () => null },
  });
  const { FormEditor } = f.load('features/forms/components/FormEditor.tsx');
  return {
    storage: f,
    general: () => general,
    mount: async (selectedForm = null) => {
      let tree;
      await act(async () => {
        tree = create(
          React.createElement(FormEditor, {
            pinId: 'qa-pin',
            selectedForm,
            isEditing: true,
            onClose: () => closes++,
          })
        );
      });
      await act(async () => {
        general.setFieldValue('village', 'Krang Svat');
      });
      return tree;
    },
    closes: () => closes,
  };
}

test('blank names and IDs remain blank through actual editor Save, SQLite, outbox and reopen', async (t) => {
  let created;
  const f = editorFixture(t, async (values) => {
    created = await f.storage.formService.createForm(values);
  });
  let tree = await f.mount();
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
  });
  const stored = await f.storage.formService.getFormById(created.id);
  for (const field of ['name', 'householdNumber', 'villageId']) assert.equal(stored[field], '');
  assert.ok(stored.dataCollectionDate);
  const payload = JSON.parse(f.storage.operations().find((op) => op.entityType === 'form').payload);
  for (const field of ['name', 'householdNumber', 'villageId']) assert.equal(payload[field], '');
  await act(async () => tree.unmount());
  tree = await f.mount(stored);
  for (const field of ['name', 'householdNumber', 'villageId'])
    assert.equal(f.general().values[field], '');
  await act(async () => tree.unmount());
});

for (const householdNumber of ['', null]) {
  test(`editing another answer preserves blank name/ID and ${JSON.stringify(householdNumber)} household ID`, async (t) => {
    const f = editorFixture(t, async () => {}, {
      updateForm: ({ id, values, baseline }) =>
        f.storage.formService.updateForm(id, values, baseline),
    });
    const initial = await f.storage.formService.createForm({
      ...f.storage.values,
      village: 'Krang Svat',
      name: '',
      villageId: '',
      householdNumber,
      dataCollectionDate: '22 May 2026',
    });
    const selected = await f.storage.formService.getFormById(initial.id);
    const tree = await f.mount(selected);
    await act(async () => f.general().setFieldValue('age', 0));
    await act(async () => {
      await tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
    });
    const stored = await f.storage.formService.getFormById(initial.id);
    assert.equal(stored.name, '');
    assert.equal(stored.villageId, '');
    assert.equal(stored.householdNumber, householdNumber);
    assert.equal(stored.dataCollectionDate, '22 May 2026');
    assert.equal(stored.age, 0);
    assert.equal(f.closes(), 1);
    await act(async () => tree.unmount());
  });
}

test('opening an existing form does not guess a missing collection date from its IDs', async (t) => {
  const f = editorFixture(t, async () => {});
  const selected = {
    ...f.storage.values,
    id: 'qa-existing',
    version: 1,
    createdAt: new Date(),
    status: 'synced',
    householdNumber: 'QA-H1',
    villageId: 'QA-V1',
    dataCollectionDate: null,
  };
  const tree = await f.mount(selected);
  assert.equal(f.general().values.dataCollectionDate, null);
  assert.equal(f.general().values.householdNumber, 'QA-H1');
  assert.equal(f.general().values.villageId, 'QA-V1');
  await act(async () => tree.unmount());
});

test('cards display Not provided for blank names without substituting village or changing the form', async (t) => {
  const f = componentFixture(t);
  const { FormCard } = f.load('features/forms/components/FormCard.tsx');
  for (const name of ['', '  ', 'QA supplied name', 'Unknown', 'Date collected QA legacy text']) {
    const form = { ...f.values, name, id: 'qa-card', createdAt: new Date(), status: 'synced' };
    let tree;
    await act(async () => {
      tree = create(React.createElement(FormCard, { form, isSynced: true, onPress() {} }));
    });
    const texts = tree.root.findAllByType('Text').map((node) => node.props.children);
    assert.equal(texts[0], name.trim() ? name : 'Not provided');
    assert.equal(form.name, name);
    await act(async () => tree.unmount());
  }
});

test('read-only details show missing names and both IDs as display text only', async (t) => {
  const f = componentFixture(t, { 'expo-checkbox': { Checkbox: 'Checkbox' } });
  const General = f.load('features/forms/components/GeneralSection.tsx').default;
  const values = {
    ...f.values,
    name: '',
    villageId: '',
    householdNumber: null,
    dataCollectionDate: null,
  };
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(General, {
        values,
        disabled: true,
        setFieldValue() {
          assert.fail('view must not mutate answers');
        },
        handleChange: () => () => assert.fail('view must not mutate answers'),
        errors: {},
        touched: {},
      })
    );
  });
  const texts = tree.root.findAllByType('Text').map((node) => node.props.children);
  assert.equal(texts.filter((value) => value === 'Not provided').length, 3);
  assert.ok(texts.includes('Household ID') && texts.includes('Village ID'));
  assert.equal(values.name, '');
  assert.equal(values.villageId, '');
  assert.equal(values.householdNumber, null);
  await act(async () => tree.unmount());
});

test('actual React Save handler receives 50 presses while storage is held: one save and one close', async (t) => {
  let finish;
  let saves = 0;
  const f = editorFixture(t, async () => {
    saves++;
    await new Promise((resolve) => {
      finish = resolve;
    });
  });
  const tree = await f.mount();
  const promises = [];
  await act(async () => {
    const button = tree.root.findByProps({ accessibilityLabel: 'Save form' });
    for (let i = 0; i < 50; i++) promises.push(button.props.onPress());
  });
  assert.equal(saves, 1);
  assert.equal(tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.disabled, true);
  await act(async () => {
    finish();
    await Promise.all(promises);
  });
  assert.equal(f.closes(), 1);
  await act(async () => tree.unmount());
});

test('actual React Save failure leaves the form open and permits one deliberate retry', async (t) => {
  let saves = 0;
  const f = editorFixture(t, async () => {
    if (++saves === 1) throw new Error('QA disk full');
  });
  const tree = await f.mount();
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
  });
  assert.equal(f.closes(), 0);
  assert.equal(tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.disabled, false);
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
  });
  assert.equal(saves, 2);
  assert.equal(f.closes(), 1);
  await act(async () => tree.unmount());
});

test('an old image request resolving after props change cannot display the wrong household photo', async (t) => {
  const finishes = new Map();
  const f = componentFixture(t, {
    '~/services/images/ImageManager': {
      loadCachedImage: (_pin, name) => new Promise((resolve) => finishes.set(name, resolve)),
    },
  });
  const { FallbackImage } = f.load('shared/components/FallbackImage.tsx');
  let tree;
  await act(async () => {
    tree = create(React.createElement(FallbackImage, { pinId: 'a', filename: 'old.jpg' }));
  });
  await act(async () => {
    tree.update(React.createElement(FallbackImage, { pinId: 'b', filename: 'new.jpg' }));
  });
  await act(async () => {
    finishes.get('old.jpg')('file:///old.jpg');
  });
  assert.equal(tree.root.findAllByType('Image').length, 0);
  await act(async () => {
    finishes.get('new.jpg')('file:///new.jpg');
  });
  assert.equal(tree.root.findByType('Image').props.source.uri, 'file:///new.jpg');
  await act(async () => tree.unmount());
});

test('a failed local photo triggers exactly one remote fallback', async (t) => {
  const calls = [];
  const f = componentFixture(t, {
    '~/services/images/ImageManager': {
      loadCachedImage: async (_p, _f, force) => {
        calls.push(force);
        return force ? 'https://qa.invalid/photo.jpg' : 'file:///photo.jpg';
      },
    },
  });
  const { FallbackImage } = f.load('shared/components/FallbackImage.tsx');
  let tree;
  await act(async () => {
    tree = create(React.createElement(FallbackImage, { pinId: 'p', filename: 'photo.jpg' }));
  });
  await act(async () => {
    tree.root.findByType('Image').props.onError({ nativeEvent: { error: 'QA missing file' } });
  });
  assert.deepEqual(calls, [false, true]);
  await act(async () => tree.unmount());
});

test('required-field validation prevents saving invalid age and keeps the editor open', async (t) => {
  let saves = 0;
  const f = editorFixture(t, async () => saves++);
  const tree = await f.mount();
  await act(async () => f.general().setFieldValue('age', 23.5));
  await act(async () => {
    await tree.root.findByProps({ accessibilityLabel: 'Save form' }).props.onPress();
  });
  assert.equal(saves, 0);
  assert.equal(f.closes(), 0);
  await act(async () => tree.unmount());
});

test('option rows preserve boolean false and show Other text input for supported spellings', async (t) => {
  const f = componentFixture(t, { 'expo-checkbox': { Checkbox: 'Checkbox' } });
  const Radio = f.load('features/forms/components/RadioGroup.tsx').default;
  const changes = [];
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Radio, {
        name: 'canAttendHealthScreening',
        options: [{ label: 'No', value: false }],
        values: { canAttendHealthScreening: null },
        setFieldValue: (key, value) => changes.push([key, value]),
      })
    );
  });
  await act(async () => tree.root.findByType('Pressable').props.onPress());
  assert.deepEqual(changes, [['canAttendHealthScreening', false]]);
  for (const value of ['Other', 'Others', 'others']) {
    await act(async () =>
      tree.update(
        React.createElement(Radio, {
          name: 'village',
          options: [{ label: 'Other', value }],
          values: { village: value },
          setFieldValue() {},
          otherFieldName: 'otherVillage',
          otherValue: 'QA preserved other answer',
        })
      )
    );
    assert.equal(tree.root.findByType('TextInput').props.value, 'QA preserved other answer');
  }
  await act(async () => tree.unmount());
});

test('disabled option rows cannot alter answers even if their handler is invoked', async (t) => {
  const f = componentFixture(t, { 'expo-checkbox': { Checkbox: 'Checkbox' } });
  const Group = f.load('features/forms/components/CheckboxGroup.tsx').default;
  let calls = 0,
    tree;
  await act(async () => {
    tree = create(
      React.createElement(Group, {
        name: 'waterSources',
        options: ['QA water'],
        values: { waterSources: [] },
        disabled: true,
        setFieldValue: () => calls++,
      })
    );
  });
  await act(async () => tree.root.findByType('Pressable').props.onPress());
  assert.equal(calls, 0);
  await act(async () => tree.unmount());
});

test('the actual form-list hook selects metadata without loading survey answers', async (t) => {
  let rows;
  const f = componentFixture(t, {
    '~/hooks/useLocalQuery': {
      useLocalQuery: (query) => {
        rows = query.all();
        return { data: rows };
      },
    },
  });
  await f.formService.createForm(f.values);
  const { useFetchForms } = f.load('features/forms/hooks/useFetchForms.ts');
  let tree;
  function Probe() {
    useFetchForms(f.pin.id);
    return null;
  }
  await act(async () => {
    tree = create(React.createElement(Probe));
  });
  assert.equal(rows.length, 1);
  assert.equal(Object.keys(rows[0]).length, 8);
  assert.equal(rows[0].longTermConditions, undefined);
  await act(async () => tree.unmount());
});
