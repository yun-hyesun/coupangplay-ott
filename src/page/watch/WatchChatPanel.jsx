import { useEffect, useId, useState } from 'react';
import WatchIcon from './WatchIcon';
import { subscribeWatchMembers } from '../../service/sessionService';

export default function WatchChatPanel({ togetherMode, sessionId, messages, draft, onDraftChange, onSend, onClose, error, sending, currentUid, onCopyInvite, manualInviteUrl }) {
  const membersId = useId();
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState(null);
  const [membersError, setMembersError] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    return subscribeWatchMembers(sessionId, setMembers, () => setMembersError(true));
  }, [sessionId]);
  const memberNames = new Map(members?.map(member => [member.id, member.name]));

  return <aside className="watch-side-panel" aria-label="실시간 채팅">
    <header className="watch-side-panel__header">
      <div><h2>실시간 채팅</h2><p>{togetherMode ? '같이 보기 참여자와 대화해 보세요.' : '같이 보기를 켜고 대화에 참여해 보세요.'}</p></div>
      <button type="button" onClick={onClose} aria-label="채팅 닫기"><WatchIcon name="close" /></button>
    </header>
    {togetherMode && sessionId && <div className="watch-side-panel__session-actions">
      <div className="watch-side-panel__action-row">
        <button type="button" aria-expanded={membersOpen} aria-controls={membersId} onClick={() => setMembersOpen(open => !open)}>
          <span aria-live="polite">참여자{members && !membersError ? ` ${members.length}명` : ''}</span>
          <WatchIcon name={membersOpen ? 'chevron-up' : 'chevron-down'} />
        </button>
        <button type="button" onClick={onCopyInvite}>초대 링크 복사</button>
      </div>
      <div id={membersId} className="watch-side-panel__members" hidden={!membersOpen}>
        {membersError ? <p role="status">참여자 목록을 불러오지 못했어요.</p>
          : !members ? <p role="status">참여자를 불러오는 중이에요.</p>
          : !members.length ? <p>아직 입장한 참여자가 없어요.</p>
          : <ul aria-label="입장한 참여자">{members.map(member => <li key={member.id}>
            <span>{member.name || '사용자'}{member.id === currentUid ? ' (나)' : ''}</span>
            {member.role === 'host' && <small>방장</small>}
          </li>)}</ul>}
      </div>
      {manualInviteUrl && <label className="watch-side-panel__invite-url">초대 링크
        <input type="url" value={manualInviteUrl} readOnly onFocus={event => event.currentTarget.select()} />
      </label>}
    </div>}
    {error && <p className="watch-side-panel__error" role="alert">{error}</p>}
    <div className="watch-side-panel__messages" aria-live="polite">
      {!togetherMode ? <p className="watch-side-panel__empty">화면 오른쪽 상단의 같이 보기를 켜면 실시간 채팅을 이용할 수 있어요.</p>
        : messages.length === 0 ? <p className="watch-side-panel__empty">아직 채팅이 없어요. 첫 메시지를 남겨보세요.</p>
          : messages.map(message => <div className="watch-side-panel__message" key={message.id}>
            <strong>{message.senderId === currentUid ? '나' : memberNames.get(message.senderId) || message.senderName || '사용자'}</strong>
            <p>{message.text}</p>
          </div>)}
    </div>
    <form className="watch-side-panel__compose" onSubmit={onSend}>
      <input value={draft} onChange={event => onDraftChange(event.target.value)} maxLength={300} placeholder={togetherMode ? '메시지를 입력하세요' : '같이 보기에서 채팅할 수 있어요'} aria-label="실시간 채팅 메시지" disabled={!togetherMode} />
      <button type="submit" disabled={!togetherMode || !draft.trim() || sending}>전송</button>
    </form>
  </aside>;
}
