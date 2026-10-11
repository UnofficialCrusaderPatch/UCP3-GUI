import { useId, useState } from 'react';
import { UninstallPlan } from '../../../../../function/extensions/dependency-management/uninstall';
import { createExtensionID } from '../../../../../function/global/constants/extension-id';
import Message from '../../../../general/message';
import { showModalOkCancel } from '../../../../modals/modal-ok-cancel';

// eslint-disable-next-line import/prefer-default-export
export function UninstallReview({
  plan,
  cleanup,
  onChange,
}: {
  plan: UninstallPlan;
  cleanup: UninstallPlan;
  onChange: (clean: boolean) => void;
}) {
  const [clean, setClean] = useState(false);
  const id = useId();
  const list = (extensions: UninstallPlan['selected']) =>
    extensions.map((ext) => (
      <li key={createExtensionID(ext)}>
        {ext.definition['display-name'] || ext.name} ({ext.version})
      </li>
    ));
  return (
    <div>
      <strong>
        <Message message="content.uninstallation.selected" />
      </strong>
      <ul>{list(plan.selected)}</ul>
      {!!plan.dependents.length && (
        <>
          <strong>
            <Message message="content.uninstallation.dependents" />
          </strong>
          <ul>{list(plan.dependents)}</ul>
        </>
      )}
      {!!cleanup.unused.length && !cleanup.errors.length && (
        <>
          <label className="discovery-sword" htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={clean}
              onChange={(event) => {
                setClean(event.target.checked);
                onChange(event.target.checked);
              }}
            />
            <span>
              <Message message="content.uninstallation.cleanup" />
            </span>
          </label>
          {clean && <ul>{list(cleanup.unused)}</ul>}
          <p>
            <Message message="content.uninstallation.cleanup.help" />
          </p>
        </>
      )}
    </div>
  );
}

export async function confirmUninstall(
  plan: UninstallPlan,
  cleanup: UninstallPlan,
) {
  let clean = false;
  const confirmed = await showModalOkCancel({
    title: 'content.uninstallation.review.title',
    message: 'content.uninstallation.review.message',
    ok: 'store.content.uninstall',
    children: (
      <UninstallReview
        plan={plan}
        cleanup={cleanup}
        onChange={(value) => {
          clean = value;
        }}
      />
    ),
  });
  if (!confirmed) return undefined;
  return clean ? cleanup : plan;
}
