import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface InvalidTableProps {
  tableId?: string;
  message?: string;
}

export const InvalidTable = ({ tableId, message }: InvalidTableProps) => {
  const navigate = useNavigate();
  const detail = tableId ? `Bàn "${tableId}" không tồn tại.` : 'Không tìm thấy bàn.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#fcf9f4]">
      <h1 className="text-3xl sm:text-4xl font-black italic mb-3 text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
        Bàn không tồn tại
      </h1>
      <p className="text-gray-500 mb-8 max-w-sm font-medium">
        {message || `${detail} Vui lòng quét lại QR đúng.`}
      </p>
      <Button onClick={() => navigate('/')} size="lg">
        Về trang bắt đầu
      </Button>
    </div>
  );
};
