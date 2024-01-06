import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { useAtomValue } from 'jotai';

// TODO: implement this function
const CreatePackButtonCallback = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { activeExtensions } = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
};

export default CreatePackButtonCallback;
