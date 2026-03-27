import type { UserProfile, FamilyMember, DietaryTag } from '../types';
import { generateId } from '../utils';

interface Props {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const ALL_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'fish-free'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfileSettings({ profile, onSave }: Props) {
  function updateProfile(updates: Partial<UserProfile>) {
    onSave({ ...profile, ...updates });
  }

  function updateMember(id: string, updates: Partial<FamilyMember>) {
    onSave({
      ...profile,
      members: profile.members.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  }

  function addMember() {
    const newMember: FamilyMember = {
      id: generateId(),
      name: 'New Member',
      age: 30,
      type: 'adult',
      dietaryRestrictions: [],
      allergies: [],
      servingMultiplier: 1,
    };
    onSave({ ...profile, members: [...profile.members, newMember] });
  }

  function removeMember(id: string) {
    onSave({ ...profile, members: profile.members.filter((m) => m.id !== id) });
  }

  function toggleBulkDay(day: number) {
    const bulkDays = profile.bulkDays.includes(day)
      ? profile.bulkDays.filter((d) => d !== day)
      : [...profile.bulkDays, day];
    updateProfile({ bulkDays });
  }

  function toggleTag(memberId: string, tag: DietaryTag) {
    const member = profile.members.find((m) => m.id === memberId)!;
    const restrictions = member.dietaryRestrictions.includes(tag)
      ? member.dietaryRestrictions.filter((t) => t !== tag)
      : [...member.dietaryRestrictions, tag];
    updateMember(memberId, { dietaryRestrictions: restrictions });
  }

  return (
    <div className="p-4 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Family Profile & Settings</h2>

      {/* Family name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Family Name</label>
        <input
          className="border rounded px-2 py-1 text-sm w-full max-w-xs"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
        />
      </div>

      {/* Week settings */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold mb-3">Schedule Settings</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Week starts on</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={profile.weekStart}
              onChange={(e) => updateProfile({ weekStart: +e.target.value as 0 | 1 })}
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weekday max cook time (min)</label>
            <input
              type="number"
              min={10}
              max={120}
              className="border rounded px-2 py-1 text-sm w-20"
              value={profile.weekdayMaxCookMins}
              onChange={(e) => updateProfile({ weekdayMaxCookMins: +e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium mb-2">Bulk cook days</label>
          <div className="flex gap-2">
            {DAYS.map((day, i) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleBulkDay(i)}
                className={`px-2 py-1 rounded text-xs border ${
                  profile.bulkDays.includes(i)
                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Family members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Family Members</h3>
          <button
            onClick={addMember}
            className="text-xs bg-green-600 text-white px-2 py-1 rounded"
          >
            + Add Member
          </button>
        </div>

        <div className="space-y-3">
          {profile.members.map((member) => (
            <div key={member.id} className="border rounded-lg p-3 bg-white">
              <div className="grid sm:grid-cols-3 gap-2 mb-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Name</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={member.name}
                    onChange={(e) => updateMember(member.id, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                  <select
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={member.type}
                    onChange={(e) => {
                      const type = e.target.value as 'adult' | 'toddler';
                      updateMember(member.id, {
                        type,
                        servingMultiplier: type === 'toddler' ? 0.5 : 1,
                      });
                    }}
                  >
                    <option value="adult">Adult</option>
                    <option value="toddler">Toddler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Serving ×</label>
                  <input
                    type="number"
                    step={0.25}
                    min={0.25}
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={member.servingMultiplier}
                    onChange={(e) => updateMember(member.id, { servingMultiplier: +e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">Dietary Restrictions</label>
                <div className="flex flex-wrap gap-1">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(member.id, tag)}
                      className={`px-2 py-0.5 rounded-full text-xs border ${
                        member.dietaryRestrictions.includes(tag)
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">
                    Allergies (comma-separated)
                  </label>
                  <input
                    className="border rounded px-2 py-1 text-sm"
                    placeholder="e.g. peanuts, shellfish"
                    value={member.allergies.join(', ')}
                    onChange={(e) =>
                      updateMember(member.id, {
                        allergies: e.target.value
                          .split(',')
                          .map((a) => a.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                {profile.members.length > 1 && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
