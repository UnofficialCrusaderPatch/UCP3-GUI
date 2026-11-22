import { useId, useState } from 'react';
import { ProfileFamilyConflict } from '../../../../function/extensions/dependency-management/families';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import Message from '../../../general/message';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

export function FamilyChooser({
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

/**
 * A saved profile selects several configurations of one family. Asks the player to keep
 * one per family; OK does nothing until every family has a choice. Returns the names to
 * leave out of the loaded profile, or undefined when the player cancels. Nothing is
 * changed here; the caller loads a filtered copy.
 */
export async function chooseProfileFamilyMembers(
  conflicts: ProfileFamilyConflict[],
) {
  const chosen: Record<string, string> = {};
  const confirmed = await showModalOkCancel({
    title: 'config.load.family.title',
    message: 'config.load.family.message',
    confirmable: () => conflicts.every(({ family }) => chosen[family]),
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
