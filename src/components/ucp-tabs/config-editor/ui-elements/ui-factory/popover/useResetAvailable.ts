import { useAtomValue } from 'jotai';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../../function/configuration/state';

/** Match the existing inline reset rule, including explicit choices of defaults. */
export default function useResetAvailable(url: string) {
  const user = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const touched = useAtomValue(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  return user[url] !== undefined && touched[url] === true;
}
