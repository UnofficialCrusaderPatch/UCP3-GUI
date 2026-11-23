import { useId, useState } from 'react';
import { ProfileFamilyConflict } from '../../../../function/extensions/dependency-management/families';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import Message from '../../../general/message';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

function FamilyChooser({
  conflicts,
  onChange,
}: {
  conflicts: ProfileFamilyConflict[];
  onChange: (family: string, member: string) => void;
}) {
  const id = useId();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  return (
    <div>
      {conflicts.map(({ family, members }) => (
        <fieldset key={family} className="mb-2">
          <legend className="fs-6">
            <Message
              message={{ key: 'config.load.family.legend', args: { family } }}
            />
          </legend>
          {members.map((member) => {
            const inputId = `${id}-${family}-${member.name}`;
            return (
              <label
                key={createExtensionID(member)}
                htmlFor={inputId}
                className="d-block"
              >
                <input
                  id={inputId}
                  type="radio"
                  name={`${id}-${family}`}
                  checked={chosen[family] === member.name}
                  onChange={() => {
                    setChosen({ ...chosen, [family]: member.name });
                    onChange(family, member.name);
                  }}
                />{' '}
                {member.definition['display-name'] || member.name} (
                {member.version})
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

/** Asks the player to keep one member per family; returns the names to leave out, or undefined on Cancel. */
// eslint-disable-next-line import/prefer-default-export
export async function chooseProfileFamilyMembers(
  conflicts: ProfileFamilyConflict[],
) {
  const chosen: Record<string, string> = {};
  const confirmed = await showModalOkCancel({
    title: 'config.load.family.title',
    message: 'config.load.family.message',
    // Every family needs a choice, and the choices together must keep exactly one
    // member per family (a member can belong to several families).
    confirmable: () => {
      const keep = new Set(Object.values(chosen));
      return conflicts.every(
        ({ family, members }) =>
          chosen[family] !== undefined &&
          members.filter(({ name }) => keep.has(name)).length === 1,
      );
    },
    children: (
      <FamilyChooser
        conflicts={conflicts}
        onChange={(family, member) => {
          chosen[family] = member;
        }}
      />
    ),
  });
  if (!confirmed) return undefined;
  const keep = new Set(Object.values(chosen));
  return [
    ...new Set(
      conflicts.flatMap(({ members }) =>
        members.map(({ name }) => name).filter((name) => !keep.has(name)),
      ),
    ),
  ];
}
