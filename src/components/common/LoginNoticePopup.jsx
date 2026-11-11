import { useNavigate } from 'react-router-dom';
import { Popup } from './Popup';
export const LoginNoticePopup = ({ onClose }) => {
  const navigate = useNavigate();
  return <Popup title="로그인 후 이용해 주세요" description={'찜한 콘텐츠를 저장하려면\n로그인 후 프로필을 선택해 주세요.'}
    onClose={onClose} confirmText="로그인" onConfirm={() => { navigate('/login'); }} />;
};
