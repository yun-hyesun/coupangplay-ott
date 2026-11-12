import { useEffect, useId, useRef, useState } from 'react';
import WatchIcon from './WatchIcon';
import { Popup } from '../../components/common/Popup';
import { kickWatchMember, subscribeWatchMembers, watchMemberId } from '../../service/sessionService';

export default function WatchChatPanel({ togetherMode, sessionId, messages, draft, onDraftChange, onSend, onClose, error, sending, currentUid, currentProfileId, onCopyInvite, manualInviteUrl }) {
  const membersId = useId();
  const actions = useRef(null);
  const membersButton = useRef(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [roster, setRoster] = useState(null);
  const [membersError, setMembersError] = useState(false);
  const [kickTarget, setKickTarget] = useState(null);
  useEffect(() => {
    if (!sessionId) return;
    return subscribeWatchMembers(sessionId, setRoster, () => setMembersError(true));
  }, [sessionId]);

  useEffect(() => {
    if (!membersOpen || kickTarget) return;
    const dismiss = event => {
      if (!actions.current?.contains(event.target)) setMembersOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [membersOpen, kickTarget]);

  const participants = roster?.participants;
  const currentMember = watchMemberId(currentUid, currentProfileId);
  const isHost = roster?.members.some(member => member.id === currentMember && member.role === 'host');
  const memberNames = new Map(roster?.members.map(member => [member.id, member.name]));
  const senderName = message => {
    if (!message.senderProfileId) return message.senderId === currentUid ? '나' : message.senderName || '사용자';
    const sender = watchMemberId(message.senderId, message.senderProfileId);
    return sender === currentMember ? '나' : memberNames.get(sender) || message.senderName || '사용자';
  };

  return <aside className="watch-side-panel" aria-label="실시간 채팅">
    <header className="watch-side-panel__header">
      <div><h2>실시간 채팅</h2><p>{togetherMode ? '같이 보기 참여자와 대화해 보세요.' : '같이 보기를 켜고 대화에 참여해 보세요.'}</p></div>
      <button type="button" onClick={onClose} aria-label="채팅 닫기"><WatchIcon name="close" /></button>
    </header>
    {togetherMode && sessionId && <div className="watch-side-panel__session-actions">
      <div className="watch-side-panel__action-row" ref={actions} onKeyDown={event => {
        if (event.key !== 'Escape' || !membersOpen) return;
        setMembersOpen(false);
        membersButton.current?.focus();
      }}>
        <button ref={membersButton} type="button" aria-expanded={membersOpen} aria-controls={membersId} onClick={() => setMembersOpen(open => !open)}>
          <span aria-live="polite">참여자{participants && !membersError ? ` ${participants.length}명` : ''}</span>
          <WatchIcon name={membersOpen ? 'chevron-up' : 'chevron-down'} />
        </button>
        <button type="button" onClick={() => { setMembersOpen(false); onCopyInvite(); }}>초대 링크 복사</button>
        <div id={membersId} className="watch-side-panel__members" hidden={!membersOpen}>
          {membersError ? <p role="status">참여자 목록을 불러오지 못했어요.</p>
            : !participants ? <p role="status">참여자를 불러오는 중이에요.</p>
            : !participants.length ? <p>접속 중인 참여자가 없어요.</p>
            : <ul aria-label="접속 중인 참여자">{participants.map(member => <li key={member.id}>
              <span>{member.name || '사용자'}{member.id === currentMember ? ' (나)' : ''}</span>
              {member.role === 'host' && <small>방장</small>}
              {isHost && member.role === 'member' && member.id !== currentMember && <button type="button"
                className="watch-side-panel__kick" aria-label={`${member.name || '사용자'} 추방`} onClick={() => setKickTarget(member)}>추방</button>}
            </li>)}</ul>}
        </div>
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
            <strong>{senderName(message)}</strong>
            <p>{message.text}</p>
          </div>)}
    </div>
    <form className="watch-side-panel__compose" onSubmit={onSend}>
      <input value={draft} onChange={event => onDraftChange(event.target.value)} maxLength={300} placeholder={togetherMode ? '메시지를 입력하세요' : '같이 보기에서 채팅할 수 있어요'} aria-label="실시간 채팅 메시지" disabled={!togetherMode} />
      <button type="submit" disabled={!togetherMode || !draft.trim() || sending}>전송</button>
    </form>
    {kickTarget && <Popup title="참여자를 추방할까요?" description={`${kickTarget.name || '사용자'} 프로필은 이 방에 다시 참여할 수 없어요.`}
      confirmText="추방" onClose={() => setKickTarget(null)} onConfirm={async () => {
        await kickWatchMember(sessionId, kickTarget.id);
        membersButton.current?.focus();
      }} />}
  </aside>;
}
