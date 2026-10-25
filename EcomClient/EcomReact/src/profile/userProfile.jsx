import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/api";

function shapeUser(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.userId ?? 0,
    username: raw.username ?? "",
    name: raw.name ?? raw.fullName ?? raw.username ?? "Người dùng",
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
      setNote("Cập nhật hồ sơ thành công.");
      setTimeout(() => setNote(""), 2000);
    } catch {
      setNote("Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Đang tải hồ sơ…</div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">Hồ sơ cá nhân</h1>
      <p className="text-gray-500 mt-1">Thông tin tài khoản của bạn</p>

      <div className="mt-4 border-b">
        <div className="py-2 -mb-px inline-block border-b-2 border-black font-semibold text-sm">
          Tổng quan
        </div>
      </div>

      <div className="mt-6 rounded-2xl border shadow-sm p-6">
        <div className="mb-6">
          <div className="text-xl font-semibold">Thông tin cá nhân</div>
          <div className="text-gray-500 text-sm">
            Chi tiết tài khoản trên hệ thống
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
              title="Chỉnh sửa hồ sơ"
            >
              Sửa
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
                title="Lưu thay đổi"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                onClick={exitEdit}
                disabled={saving}
                className="px-4 py-2 rounded-md border hover:bg-gray-50"
                title="Hủy chỉnh sửa"
              >
                Hủy
              </button>
            </div>
          )}
        </div>

        {note && <p aria-live="polite" className={`mb-5 text-sm ${note.startsWith("Không thể") ? "text-red-700" : "text-green-700"}`}>{note}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <ReadonlyField label="Họ và tên" value={me?.name} />
          <ReadonlyField label="Tên đăng nhập" value={me?.username} />

          
          <ReadonlyOrTextIfEmpty
            label="Giới tính"
            originalValue={me?.gender}
            isEdit={isEdit}
            value={form.gender}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            placeholder="Nhập giới tính"
          />
          <ReadonlyOrTextIfEmpty
            label="Số điện thoại"
            originalValue={me?.phone}
            isEdit={isEdit}
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="Nhập số điện thoại"
          />
          <ReadonlyOrTextIfEmpty
            label="Email"
            originalValue={me?.email}
            isEdit={isEdit}
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            type="email"
            placeholder="Nhập email"
          />
        </div>
      </div>
    </div>
  );
}
