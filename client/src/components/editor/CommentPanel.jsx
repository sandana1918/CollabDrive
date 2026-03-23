import { useMemo, useState } from "react";
import { Button } from "../ui/Button";

export const CommentPanel = ({ open, comments = [], canComment, selectedText, onAddComment, onResolveComment }) => {
  const [message, setMessage] = useState("");
  const unresolved = useMemo(() => comments.filter((comment) => !comment.resolved), [comments]);

  if (!open) return null;

  return (
    <aside className="w-full rounded-[24px] border border-[#eadfe6] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.08)] xl:w-[320px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f6471]">Comments</p>
          <h3 className="mt-1 text-lg font-medium text-[#202124]">Discussion</h3>
        </div>
        <span className="rounded-full bg-[#f7eff4] px-3 py-1 text-xs font-medium text-[#6f6471]">{unresolved.length} open</span>
      </div>

      {canComment ? (
        <div className="mt-4 rounded-[18px] border border-[#e6ebf2] bg-[#fcf8fb] p-3">
          <p className="text-xs text-[#6f6471]">Selection</p>
          <p className="mt-1 line-clamp-2 text-sm text-[#202124]">{selectedText || "Select text in the document or leave a general comment."}</p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Leave a comment"
            className="mt-3 min-h-[96px] w-full resize-none rounded-2xl border border-[#d7dce5] bg-white px-4 py-3 text-sm text-[#202124] outline-none focus:border-[#d27b9d]"
          />
          <div className="mt-3 flex justify-end">
            <Button
              disabled={!message.trim()}
              onClick={async () => {
                const ok = await onAddComment({ message: message.trim(), anchorText: selectedText || "" });
                if (ok) setMessage("");
              }}
            >
              Add comment
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {comments.length ? comments.map((comment) => (
          <div key={comment.id} className={`rounded-[18px] border px-4 py-3 ${comment.resolved ? "border-[#e9edf3] bg-[#f8fafc] opacity-70" : "border-[#e0e7f1] bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#202124]">{comment.user?.name || comment.user?.username || "Collaborator"}</p>
                <p className="mt-1 text-xs text-[#6f6471]">{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
              {!comment.resolved && canComment ? <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => onResolveComment(comment.id, true)}>Resolve</Button> : null}
            </div>
            {comment.anchorText ? <p className="mt-3 rounded-xl bg-[#fbf6f9] px-3 py-2 text-xs text-[#6f6471]">“{comment.anchorText}”</p> : null}
            <p className="mt-3 text-sm leading-6 text-[#202124]">{comment.message}</p>
          </div>
        )) : <p className="text-sm text-[#6f6471]">No comments yet.</p>}
      </div>
    </aside>
  );
};




