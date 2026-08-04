# Audit modal them/sua/xoa tu pos_web

Ngay audit: 2026-08-03

Pham vi kiem tra:
- Quet route va page trong `pos-web-v2/src/pages`.
- Doi chieu cac man hinh co `detailUrl`, `createUrl`, `updateUrl`, `statusUrl` ben `pos_web/src/app/views`.
- Tap trung vao modal them/sua/xoa va nhung noi co nut nhung handler chua hoan thien.

## Can migrate uu tien cao

| Tinh nang | Route v2 | Tinh trang hien tai | Logic cu trong pos_web can migrate |
| --- | --- | --- | --- |
| Khen thuong / Ky luat | `/human-resources/reward-punish` | Chi co danh sach, filter ngay/trang thai; thieu nut them, modal chi tiet/sua, xoa/cap nhat trang thai. | `rewardpunishs/filter`, `rewardpunishs/detail`, `rewardpunishs/create`, `rewardpunishs/update`, `rewardpunishs/update-status`; form cu co nhan vien, loai thuong/phat, ly do theo type, so tien, ngay, ghi chu. |
| Bang luong | `/human-resources/salaries` | Chi co danh sach; thieu modal tao/sua/xem chi tiet, thieu action update-status. | `salary/filter`, `salary/detail`, `salary/create`, `salary/update`, `salary/update-status`; pos_web co `salary-detail` va `salary-calendar`. |
| Chi luong | `/human-resources/salary-pays` | Chi co danh sach; thieu modal tao/sua/xoa/chi tiet. | `salary/filter-salary-pay`; can doi chieu tiep `salary-pay-list` va flow chi luong cu de map endpoint tao/sua neu backend dung chung module salary. |
| Khuyen mai | `/promotions/*` | Tat ca route khuyen mai dang dung mot list chung; thieu nut them, modal detail, sua, xoa/cap nhat trang thai. | `promotions/filter`, `promotions/detail`, `promotions/create`, `promotions/update`, `promotions/update-status`; moi loai co detail rieng: discount bill, discount bill total, category, product, product quantity, same price, buy 1 get 1. |
| Hoa don ban le | `/invoices/sales` | Nut `Tao HD` chi `toast.info('dang phat trien')`; khong co modal tao/sua. | Can doi chieu `pos_web/src/app/views/invoice` va flow ban hang cu. |
| Hoa don nha hang | `/invoices/restaurant` | Click ban trong va nut `Tao don` chi bao dang phat trien; khong co modal tao don cho ban. | Can migrate flow restaurant sell/table detail: tao order theo ban, xem nhanh, huy, tach/gop neu co. |

## Co modal nhung chua dung/chua du logic cu

| Tinh nang | Route v2 | Thieu/chua dung | Logic cu can doi chieu |
| --- | --- | --- | --- |
| Phieu thu | `/currencies/receipt` | Modal moi chi co doi tuong, dia chi, so tien, ngay, ghi chu; chua co chon ly do thu chi, quy, doi tuong lien ket, chi tiet theo form cu; chua co sua/xoa tren row. | `Receipt/filter`, `Receipt/detail`, `Receipt/create`, `Receipt/update`, `Receipt/update-status`. |
| Phieu chi | `/currencies/payment` | Tuong tu phieu thu; modal qua mong, chua co sua/xoa row. | `Payment/filter`, `Payment/detail`, `Payment/create`, `Payment/update`, `Payment/update-status`. |
| Ly do thu chi | `/currencies/receipt-payment-reason` | Co modal add/edit nhung chi luu `Name`; thieu `Note` trong form, thieu image neu pos_web detail yeu cau, action status dang toggle 1/2 can doi chieu lai trang thai cu. | `ReceiptPaymentReason/detail/create/update/update-status`. |
| Loai quy | `/currencies/fund-type` | Co modal add/edit nhung chi luu `Name`; thieu `Note` trong form, chua get detail truoc khi sua. | `fundType/detail/create/update/update-status`. |
| Quy | `/currencies/fund` | Co modal add/edit nhung can doi chieu lai voi `fund-detail` cu de bo sung cac truong con thieu va get detail khi sua. | `fund/detail/create/update/update-status`. |
| Phieu nhap kho | `/stocks/stock-inputs` | Modal moi chi co so phieu, ngay, ghi chu; thieu kho, nha cung cap, product search, bang dong hang, tong tien; chua co sua/xoa row. | `stockinputs/detail/create/update/update-status`; detail cu dung `view-order-edit`, `view-order-item-list`, `view-product-search`. |
| Phieu xuat kho | `/stocks/stock-outputs` | Modal moi chi co so phieu, ngay, ghi chu; thieu kho, nhan vien/doi tuong, product search, bang dong hang; chua co sua/xoa row. | `stockoutputs/detail/create/update/update-status`; detail cu dung order/product components. |
| Phieu chuyen kho | `/stocks/stock-transfers` | Modal moi chi co so phieu, ngay, ghi chu; thieu kho xuat/kho nhap, product search, bang dong hang; chua co sua/xoa row. | `stocktransfers/detail/create/update/update-status`. |
| Phieu kiem ke | `/stocks/stock-checks` | Modal moi chi co so phieu, ngay, ghi chu; thieu kho, product search, bang dong hang co SL thuc te/chenh lech; chua co sua/xoa row. | `stockchecks/detail/create/update/update-status`. |
| Khach dat hang | `/actives/booking` | Co modal add/edit nhung chi sua thong tin co ban va chi hien thi items san co; chua co product search them dong hang nhu pos_web. | `bookings/detail/create/update/update-status`; detail cu dung `view-order-edit`, `view-order-item-list`, `view-product-search`. |
| Bao gia khach hang | `/actives/quotation` | Co modal add/edit nhung chi sua thong tin co ban va chi hien thi items san co; chua co product search them dong hang nhu pos_web. | `quotations/detail/create/update/update-status`; detail cu dung `view-order-edit`, `view-order-item-list`, `view-product-search`. |

## Dang co CRUD co ban, can audit sau neu bi sai logic field

| Tinh nang | Route v2 | Ghi chu |
| --- | --- | --- |
| Nhom mat hang | `/managers/product-groups` | Co modal add/edit/delete qua `GenericManagerPage`. Can doi chieu field nang cao neu can. |
| Nhom khach hang | `/managers/customer-groups` va sidebar trong `/actives/customers` | Co modal. |
| Nhom nha cung cap | `/managers/supplier-groups` | Co modal. |
| Don vi tinh | `/managers/units` | Co modal. |
| Quan ly shop | `/managers/shops` | Co modal/detail route; can audit rieng neu tao/sua shop sai. |
| Mau hoa don / nhom mau | `/managers/templates` | Co modal nhom, template, import, clone; da migrate kha day du. |
| Ban / khu vuc nha hang | `/actives/tables` | Co modal khu vuc, ban, batch create, QR. |
| Mat hang | `/actives/products-new` | Co modal nhom va modal mat hang; co import/export/delete selected. |
| Khach hang | `/actives/customers` | Co modal nhom va modal khach hang; co import/export/delete. |
| Nha cung cap | `/stocks/suppliers` | Co modal add/edit/status; can doi chieu field detail cu neu can. |
| Kho hang | `/stocks/stocks` | Co modal add/edit/status; can doi chieu field detail cu neu can. |
| Ca lam viec | `/human-resources/shifts` | Co modal add/edit/status; can doi chieu trang thai xoa/khoa voi pos_web. |
| Nhan vien | `/human-resources/members` | Co modal tao/sua; can audit tiep permission/user-info neu co bug. |
| Nhom nguoi dung | `/human-resources/user-groups` | Co modal add/edit/status; thieu modal phan quyen neu chua migrate. |
| Ly do thuong phat | `/human-resources/reward-punish-reason` | Da sua gan logic cu: Type thuong/phat, Note, Image, detail, create/update multipart, xoa statusId=2. |
| Ho tro / Huong dan | `/supports/supports`, `/supports/helps` | Co modal add/edit/delete/status trong shared page. |

## Handler ro/chua hoan thien khong thuoc CRUD modal

| Tinh nang | Route v2 | Ghi chu |
| --- | --- | --- |
| Bao cao Excel | `/report/order`, `/report/booking`, `/report/currency`, `/report/stock` | Cac nut Excel dang `onClick={() => {}}`; can noi endpoint export cu. |
| In bep / tem | `/actives/order` | Co toast thong bao chua noi may in cuc bo; khong phai modal CRUD. |

## De xuat thu tu migrate tiep

1. `/human-resources/reward-punish`: dang thieu CRUD gan nhat voi task vua sua ly do thuong phat.
2. `/stocks/stock-inputs`, `/stocks/stock-outputs`, `/stocks/stock-transfers`, `/stocks/stock-checks`: modal hien tai de tao phieu sai nghiep vu vi khong co dong hang.
3. `/currencies/receipt`, `/currencies/payment`: bo sung detail form day du va row actions.
4. `/promotions/*`: can tach detail theo tung type khuyen mai.
5. `/invoices/sales`, `/invoices/restaurant`: thay toast dang phat trien bang flow tao hoa don/don nha hang.
