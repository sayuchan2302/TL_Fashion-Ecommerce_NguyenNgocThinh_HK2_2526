import AdminLayout from './AdminLayout';
import PanelPlaceholder from '../../components/Panel/PanelPlaceholder';

const AdminBotAI = () => {
  return (
    <AdminLayout title="Bot và AI" breadcrumbs={['Bot và AI', 'Thử nghiệm vận hành thông minh']}>
      <PanelPlaceholder
        eyebrow="Thử nghiệm"
        title="Chatbot, FAQ và công cụ AI cho sàn"
        description="Module này hiện mới ở trạng thái thử nghiệm. Admin có thể xem định hướng vận hành, nhưng chưa nên coi đây là công cụ production cho kịch bản bot, FAQ hoặc tìm kiếm hình ảnh."
        bullets={[
          'Quản lý FAQ và auto-reply flow cho CSKH',
          'Cấu hình script cho Azune bot theo từng nhóm tình huống',
          'Kiểm soát công cụ tìm kiếm hình ảnh và governance AI',
          'Đánh dấu rõ trạng thái thử nghiệm trước khi bind backend thật',
        ]}
        actions={[
          { label: 'Về dashboard sàn', to: '/admin' },
          { label: 'Theo dõi gian hàng', to: '/admin/stores' },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminBotAI;
