import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { useAtomValue } from 'jotai';

const CreatePackButtonCallback = () => {
  const { activeExtensions } = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
};

export default CreatePackButtonCallback;
