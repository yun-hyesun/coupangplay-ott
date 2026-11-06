import WatchIcon from './WatchIcon';

export default function WatchChatPanel({ togetherMode, sessionId, messages, draft, onDraftChange, onSend, onClose, error, sending, currentUid, onCopyInvite }) {
  return <aside className="watch-side-panel" aria-label="실시간 채팅">
    <header className="watch-side-panel__header">
      <div><h2>실시간 채팅</h2><p>{togetherMode ? '같이 보기 참여자와 대화해 보세요.' : '같이 보기를 켜고 대화에 참여해 보세요.'}</p></div>
      <button type="button" onClick={onClose} aria-label="채팅 닫기"><WatchIcon name="close" /></button>
    </header>
    {togetherMode && sessionId && <button type="button" className="watch-side-panel__invite" onClick={onCopyInvite}>초대 링크 복사</button>}
    {error && <p className="watch-side-panel__error" role="alert">{error}</p>}
    <div className="watch-side-panel__messages" aria-live="polite">
      {!togetherMode ? <p className="watch-side-panel__empty">화면 오른쪽 상단의 같이 보기를 켜면 실시간 채팅을 이용할 수 있어요.</p>
        : messages.length === 0 ? <p className="watch-side-panel__empty">아직 채팅이 없어요. 첫 메시지를 남겨보세요.</p>
          : messages.map(message => <div className="watch-side-panel__message" key={message.id}>
            <strong>{message.senderId === currentUid ? '나' : message.senderName || '사용자'}</strong>
            <p>{message.text}</p>
          </div>)}
    </div>
    <form className="watch-side-panel__compose" onSubmit={onSend}>
      <input value={draft} onChange={event => onDraftChange(event.target.value)} maxLength={300} placeholder={togetherMode ? '메시지를 입력하세요' : '같이 보기에서 채팅할 수 있어요'} aria-label="실시간 채팅 메시지" disabled={!togetherMode} />
      <button type="submit" disabled={!togetherMode || !draft.trim() || sending}>전송</button>
    </form>
  </aside>;
}
