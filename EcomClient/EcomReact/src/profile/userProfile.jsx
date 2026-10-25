import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/api";

function shapeUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.userId ?? 0,
    username: raw.username ?? "",
    name: raw.name ?? raw.fullName ?? raw.username ?? "User",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    gender: raw.gender ?? "",
    avatar: raw.avatar ?? raw.avatarUrl ?? "",
  };
}

function ReadonlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-semibold break-all">{value || "-"}</div>
    </div>
  );
}

function ReadonlyOrTextIfEmpty({
  label,
  originalValue,
  isEdit,
  value,
  onChange,
  type = "text",
  placeholder,
}) {
  const isEmpty = (originalValue ?? "").toString().trim() === "";
  const showInput = isEdit && isEmpty;
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-500">{label}</div>
      {showInput ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
          placeholder={placeholder}
        />
      ) : (
        <div className="font-semibold break-all">
          {originalValue && originalValue !== "" ? originalValue : "-"}
        </div>
      )}
    </div>
  );
}

export default function UserProfile() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", gender: "" });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await getProfile();
        const u = shapeUser(s);
        setMe(u);
        setForm({ email: u.email || "", phone: u.phone || "", gender: u.gender || "" });
      } catch {
        setNote("Không thể tải hồ sơ. Vui lòng đăng nhập lại.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exitEdit = () => {
    setIsEdit(false);
    setForm({
      email: me?.email || "",
      phone: me?.phone || "",
      gender: me?.gender || "",
    });
    setNote("");
  };

  const onSave = async () => {
    setSaving(true);
    setNote("");

    const payload = {};
    if ((me?.email ?? "").trim() === "" && form.email.trim()) payload.email = form.email.trim();
    if ((me?.phone ?? "").trim() === "" && form.phone.trim()) payload.phone = form.phone.trim();
    if ((me?.gender ?? "").trim() === "" && form.gender.trim()) payload.gender = form.gender.trim();

    try {
      const updated = await updateProfile(payload);
      setMe(shapeUser(updated));
      setIsEdit(false);
      setNote("Profile updated successfully.");
      setTimeout(() => setNote(""), 2000);
    } catch {
      setNote("Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading profile…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">User Profile</h1>
      <p className="text-gray-500 mt-1">Your personal information</p>

      <div className="mt-4 border-b">
        <div className="py-2 -mb-px inline-block border-b-2 border-black font-semibold text-sm">
          Overview
        </div>
      </div>

      <div className="mt-6 rounded-2xl border shadow-sm p-6">
        <div className="mb-6">
          <div className="text-xl font-semibold">Personal Information</div>
          <div className="text-gray-500 text-sm">
            Details of your account in the system
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {me?.avatar ? (
              <img
                className="h-16 w-16 rounded-full object-cover border"
                src={me.avatar}
                alt="avatar"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gray-100 border flex items-center justify-center">
                <span className="text-lg font-semibold">
                  {(me?.name || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
            )}
            <div>
              <div className="text-lg font-semibold">{me?.name || me?.username}</div>
              <div className="text-gray-500">@{me?.username}</div>
            </div>
          </div>

          {!isEdit ? (
            <button
              onClick={() => {
                setIsEdit(true);
                setNote("");
              }}
              className="px-4 py-2 rounded-md border hover:bg-gray-50"
              title="Edit profile"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
                title="Save changes"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={exitEdit}
                disabled={saving}
                className="px-4 py-2 rounded-md border hover:bg-gray-50"
                title="Cancel editing"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {note && <p aria-live="polite" className={`mb-5 text-sm ${note.startsWith("Không thể") ? "text-red-700" : "text-green-700"}`}>{note}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <ReadonlyField label="Full name" value={me?.name} />
          <ReadonlyField label="Username" value={me?.username} />

          
          <ReadonlyOrTextIfEmpty
            label="Gender"
            originalValue={me?.gender}
            isEdit={isEdit}
            value={form.gender}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            placeholder="Enter gender"
          />
          <ReadonlyOrTextIfEmpty
            label="Phone"
            originalValue={me?.phone}
            isEdit={isEdit}
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="Enter phone number"
          />
          <ReadonlyOrTextIfEmpty
            label="Email"
            originalValue={me?.email}
            isEdit={isEdit}
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            type="email"
            placeholder="Enter email"
          />
        </div>
      </div>
    </div>
  );
}
