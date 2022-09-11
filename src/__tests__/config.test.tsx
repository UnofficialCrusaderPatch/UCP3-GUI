/* eslint-disable no-console */
import { debug } from 'console';
import '../main/framework/config/common';
import { isValuePermitted } from '../main/framework/config/value-permissions';

describe('Test 1', () => {
  it('should be true', () => {
    expect(() => {
      const a = isValuePermitted(2, { url: 'test1.hello' } as OptionEntry, []);
      debug(JSON.stringify(a));
      return a.status === 'OK';
    }).toBeTruthy();
  });
});

describe('Test 2', () => {
  it('should be false', () => {
    expect(() => {
      return (
        isValuePermitted(
          2,
          {
            type: 'number',
            url: 'test1.hello',
            value: { 'required-value': 3 },
          } as unknown as OptionEntry,
          []
        ).status === 'OK'
      );
    }).toBeTruthy();
  });
});

// const test1 = isNumberValuePermittedByConfigs(2, { url: 'test1.hello' }, []);
// reportTest('Test 1', test1);

// const test2_spec = { url: 'test2.hello' };
// const test2_configs = [
//   {
//     name: 'test2-plugin1',
//     'test2.hello': {
//       value: {
//         'suggested-value': 10,
//       },
//     },
//   },
//   {},
// ];

// const test2 = isNumberValuePermittedByConfigs(1, test2_spec, test2_configs);
// reportTest('Test 2', test2);

// const test3_spec = { url: 'test3.hello' };
// const test3_configs = [
//   {
//     name: 'test3-plugin1',
//     'test3.hello': {
//       value: {
//         'required-value': 10,
//       },
//     },
//   },
//   {},
// ];

// const test3 = isNumberValuePermittedByConfigs(1, test3_spec, test3_configs);
// reportTest('Test 3', test3);

// const test4_spec = {
//   value: {
//     choices: ['A', 'B', 'C'],
//   },
//   type: 'choice',
//   url: 'test4.choice1',
// };
// const test4_configs = [
//   {
//     name: 'test4-plugin1',
//     'test4.choice1': {
//       value: {
//         'required-value': 'A',
//       },
//     },
//   },
//   {},
// ];

// const test4 = isValuePermitted('B', test4_spec, test4_configs);
// reportTest('Test 4', test4);

// const test5_spec = {
//   value: {
//     default: 'alpha',
//   },
//   type: 'string',
//   url: 'test5.string1',
// };
// const test5_configs = [
//   {
//     name: 'test5-plugin1',
//     'test5.string1': {
//       value: {
//         'suggested-value': 'bravo',
//       },
//     },
//   },
//   {},
// ];

// const test5 = isValuePermitted('charlie', test5_spec, test5_configs);
// reportTest('Test 5', test5);

// const test6_collection = {};
// const test6_obj = {
//   modules: {
//     dummy_one_test6: {
//       version: '0.0.1',
//       options: {
//         feature1: {
//           subfeature2: {
//             value: {
//               'suggested-value': 100,
//               'required-range': {
//                 min: 0,
//                 max: 200,
//               },
//             },
//           },
//         },
//       },
//     },
//     dummy_two_test6: {
//       version: '1.0.0',
//       options: {
//         feature1: {
//           value: {
//             'required-value': 'hello world!',
//           },
//         },
//       },
//     },
//   },
// };

// Object.keys(test6_obj.modules).forEach((module) => {
//   collectConfigs(test6_collection, test6_obj.modules[module].options, module);
// });

// const test6 = test6_collection;

// reportTest('Test 6', test6);

// const test7_extensions = [
//   {
//     name: 'mod1',
//     configEntries: {},
//     optionEntries: {
//       'mod1.feature1': {
//         type: 'number',
//         value: {
//           default: 20,
//         },
//         url: 'mod1.feature1',
//       },
//     },
//   },
//   {
//     name: 'mod2',
//     configEntries: {},
//   },
// ];

// // TODO: refactor extensions to a dictionary intead of a list. NO! should be a list, because of ordering...
// const test7_extension = {
//   name: 'test7',
//   configEntries: {
//     'mod1.feature1': {
//       value: {
//         'required-value': 30,
//       },
//     },
//   },
// };

// const test7 = isValidExtensionConfigOrder(test7_extensions, test7_extension);
// reportTest('Test 7', test7);

// const test8extensions = Array.from(test7_extensions);
// test8extensions.push(test7_extension);
// test8extensions.push({
//   name: 'test8',
//   configEntries: {
//     'mod1.feature1': {
//       value: {
//         'required-value': 50,
//       },
//     },
//   },
// });
// console.log(test8extensions);
// const test8 = isAllValidExtensionConfigOrder(test8extensions);
// reportTest('Test 8', test8);

// // TODO: this should fail!
// reportTest(
//   'Test 9',
//   isValuePermitted(
//     1000,
//     test8extensions[0].optionEntries['mod1.feature1'],
//     test8extensions
//   )
// );
