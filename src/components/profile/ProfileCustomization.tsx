import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ProfileCustomization({ user, onSave }: any) {
  const [banner, setBanner] = useState(user.banner || '');
  const [avatarFrame, setAvatarFrame] = useState(user.avatarFrame || 'none');
  const [bio, setBio] = useState(user.bio || '');
  const [status, setStatus] = useState(user.status || '');

  const onDrop = (acceptedFiles: File[]) => {
    // handle upload logic
    const file = acceptedFiles[0];
    // ...upload and setBanner(url)
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="space-y-6">
      {/* Banner Upload */}
      <section>
        <h3 className="font-bold mb-2">Banner Image</h3>
        <div {...getRootProps()} className="h-32 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed">
          <input {...getInputProps()} />
          {banner ? <img src={banner} alt="Banner" className="h-full w-full object-cover rounded-lg" /> : (isDragActive ? "Drop here" : "Drag or click to upload")}
        </div>
      </section>

      {/* Avatar Frame */}
      <section>
        <h3 className="font-bold mb-2">Avatar Frame</h3>
        <div className="flex gap-4">
          {['none', 'neon', 'gold'].map(frame => (
            <button
              key={frame}
              className={`w-16 h-16 rounded-full border-4 ${avatarFrame === frame ? 'border-accent' : 'border-transparent'}`}
              onClick={() => setAvatarFrame(frame)}
            >
              {/* Render avatar with frame preview */}
              <span>{frame}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Bio/Status */}
      <section>
        <h3 className="font-bold mb-2">Bio & Status</h3>
        <textarea
          className="w-full p-2 rounded border"
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
        />
        <input
          className="w-full p-2 rounded border mt-2"
          value={status}
          onChange={e => setStatus(e.target.value)}
          placeholder="Custom status message"
        />
      </section>

      <button className="mt-4 px-6 py-2 bg-accent text-white rounded" onClick={() => onSave({ banner, avatarFrame, bio, status })}>
        Save Changes
      </button>
    </div>
  );
}
