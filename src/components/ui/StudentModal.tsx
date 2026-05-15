import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Student,
  CourseType,
  PaymentMethod,
  ResultStatus,
  StudentStatus,
} from "@/types/student";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useBranches } from "@/services/branchService";
import { useGroups } from "@/services/groupService";
import { User } from "@/types/user";

export interface CreateStudentPayload {
  first_name: string;
  last_name: string;
  phone: string;
  course_type: CourseType;
  total_price: number;
  amount_paid?: number;
  initial_payment?: number;
  payment_method?: PaymentMethod;
  group_id?: string;
  branch_id?: string;
  completion_date?: string;
  contract_number?: string;
  o83?: boolean;
  has_document?: boolean;
  result?: ResultStatus;
  notes?: string;
  status?: StudentStatus;
  registered_by?: string;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  naqd: "Naqd",
  karta: "Karta",
};

const resultLabels: Record<ResultStatus, string> = {
  oqimoqda: "Oqimoqda",
  topshirdi: "Topshirdi",
  yiqildi: "Yiqildi",
};

const studentFormSchema = z
  .object({
    first_name: z.string().min(1, "Talab qilinadi"),
    last_name: z.string().min(1, "Talab qilinadi"),
    phone: z
      .string()
      .min(1, "Talab qilinadi")
      .regex(/^\+?\d{9,15}$/, "Telefon raqami noto'g'ri"),
    course_type: z.enum(["tezkor", "avto_maktab"]),
    branch_id: z.string().min(1, "Filial tanlanmagan! Iltimos filial tanlang."),
    payment_method: z.enum(["naqd", "karta"]).optional(),
    result: z.enum(["oqimoqda", "topshirdi", "yiqildi"]).optional(),
    has_document: z.boolean().optional(),
    o83: z.boolean().optional(),
    total_price: z.coerce.number().nonnegative("Talab qilinadi"),
    amount_paid: z.coerce.number().nonnegative().optional(),
    initial_payment: z.coerce.number().nonnegative().optional(),
    group_id: z.string().optional(),
    completion_date: z.string().optional(),
    contract_number: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["active", "completed", "dropped", "frozen"]).optional(),
    registered_by: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.course_type === "avto_maktab" && !data.group_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["group_id"],
        message: "Avto maktab kursi uchun Guruh tanlash shart!",
      });
    }
  });

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStudentPayload) => void;
  loading?: boolean;
  student?: Student | null;
  courseType: CourseType;
  operators?: User[];
  disabledFields?: string[];
  defaultBranchId?: string;
}

const StudentModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  student,
  courseType,
  operators = [],
  disabledFields = [],
  defaultBranchId,
}: StudentModalProps) => {
  const { isOwner, user } = useAuthStore();
  const { data: branches } = useBranches();
  const { data: groups } = useGroups();

  const branchList = branches || [];
  // Show all groups regardless of branch for managers (cross-branch assignment)
  const groupList = (groups || []).filter(
    (g) => g.course_type === courseType || !g.course_type,
  );

  const defaultFormValues = (): StudentFormValues => ({
    first_name: "",
    last_name: "",
    phone: "",
    course_type: courseType,
    branch_id: isOwner() ? (defaultBranchId || "") : user?.branch_id || "",
    payment_method: "naqd",
    result: "oqimoqda",
    has_document: false,
    o83: false,
    total_price: courseType === "tezkor" ? 2500000 : 6000000,
    amount_paid: 0,
    initial_payment: 0,
    group_id: "",
    completion_date: "",
    contract_number: "",
    notes: "",
    status: "active",
    registered_by: "",
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: defaultFormValues(),
  });

  const [debt, setDebt] = useState(0);

  const watchedTotalPrice = form.watch("total_price");
  const watchedAmountPaid = form.watch("amount_paid");
  const watchedInitialPayment = form.watch("initial_payment");
  const watchedBranchId = form.watch("branch_id");

  useEffect(() => {
    if (open) {
      if (student) {
        form.reset({
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          course_type: student.course_type,
          branch_id: student.branch_id,
          payment_method: student.payment_method,
          result: student.result,
          has_document: student.has_document,
          o83: student.o83,
          total_price: student.total_price,
          // For tezkor edit, amount_paid means "ADD new payment" (backend is additive) — default 0.
          // For avto_maktab edit, initial_payment is ignored by backend update — keep historical for display.
          amount_paid: 0,
          initial_payment: student.initial_payment || 0,
          group_id: student.group_id || "",
          completion_date:
            student.completion_date === undefined ? "" : student.completion_date,
          contract_number: student.contract_number || "",
          notes: student.notes === undefined ? "" : student.notes,
          status: student.status || "active",
          registered_by: student.registered_by_id || "",
        });
      } else {
        form.reset(defaultFormValues());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, courseType, open]);

  useEffect(() => {
    if (student) {
      // Both course types: amount_paid in edit mode = additional new payment (backend adds it)
      setDebt(Math.max(0, (student.debt || 0) - (Number(watchedAmountPaid) || 0)));
    } else {
      const total = Number(watchedTotalPrice) || 0;
      const paid =
        courseType === "tezkor"
          ? Number(watchedAmountPaid) || 0
          : Number(watchedInitialPayment) || 0;
      setDebt(Math.max(0, total - paid));
    }
  }, [watchedTotalPrice, watchedAmountPaid, watchedInitialPayment, courseType, student]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: CreateStudentPayload = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      course_type: courseType,
      total_price: Number(values.total_price),
      payment_method: values.payment_method || undefined,
      branch_id: values.branch_id || undefined,
      result: values.result,
      has_document: values.has_document,
      notes: values.notes || undefined,
      status: values.status || "active",
      registered_by: values.registered_by || undefined,
    };

    if (courseType === "tezkor") {
      payload.amount_paid = Number(values.amount_paid) || 0;
      payload.group_id = values.group_id || undefined;
    } else {
      payload.initial_payment = Number(values.initial_payment) || 0;
      payload.group_id = values.group_id || undefined;
      payload.completion_date = values.completion_date || undefined;
      payload.contract_number = values.contract_number || undefined;
      payload.o83 = values.o83;
      // Edit-only: send additional payment for avto_maktab too (backend handles dto.amount_paid as additive on update)
      if (student && (Number(values.amount_paid) || 0) > 0) {
        payload.amount_paid = Number(values.amount_paid);
      }
    }
    await onSubmit(payload);
  });

  const formatMoney = (n: number) => new Intl.NumberFormat("uz-UZ").format(n);
  const currentBranchName =
    branchList.find((b) => b.id === watchedBranchId)?.name ||
    watchedBranchId ||
    "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {student ? "Talabani tahrirlash" : "Yangi talaba qo'shish"}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({courseType === "tezkor" ? "Tezkor" : "Avto maktab"})
            </span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familya *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ismi *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+998901234567"
                        className="bg-secondary border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filial</FormLabel>
                    {isOwner() ? (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue placeholder="Tanlang" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branchList.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <Input
                          value={currentBranchName}
                          disabled
                          className="bg-muted border-border"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="total_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kurs narxi *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        min={0}
                        disabled={disabledFields.includes("total_price")}
                        className={`${disabledFields.includes("total_price") ? "bg-muted" : "bg-secondary"} border-border`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To'lov turi</FormLabel>
                    <Select
                      value={field.value || "naqd"}
                      onValueChange={(v) => field.onChange(v as PaymentMethod)}
                      disabled={disabledFields.includes("payment_method")}
                    >
                      <FormControl>
                        <SelectTrigger
                          className={`${disabledFields.includes("payment_method") ? "bg-muted" : "bg-secondary"} border-border`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {courseType === "tezkor" ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="amount_paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {student ? "Qo'shimcha to'lov" : "To'lov miqdori"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            min={0}
                            placeholder={
                              student
                                ? "0 (yangi to'lov qo'shish uchun)"
                                : "0"
                            }
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>{student ? "Joriy qarzdorlik" : "Qarzdorlik"}</Label>
                    <Input
                      value={formatMoney(debt)}
                      disabled
                      className="bg-muted border-border text-destructive font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guruh</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groupList.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <FormField
                    control={form.control}
                    name="initial_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Boshlang'ich to'lov</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            min={0}
                            disabled={
                              !!student ||
                              disabledFields.includes("initial_payment")
                            }
                            className={`${(!!student || disabledFields.includes("initial_payment")) ? "bg-muted" : "bg-secondary"} border-border`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>{student ? "Joriy qarzdorlik" : "Qarzdorlik"}</Label>
                    <Input
                      value={formatMoney(debt)}
                      disabled
                      className="bg-muted border-border text-destructive font-medium"
                    />
                  </div>
                </div>
                {student && (
                  <FormField
                    control={form.control}
                    name="amount_paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qo'shimcha to'lov</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value || ""}
                            min={0}
                            placeholder="0 (yangi to'lov qo'shish uchun)"
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Guruh <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-secondary border-border">
                              <SelectValue placeholder="Tanlang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groupList.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="completion_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tugatish sanasi</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contract_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shartnoma raqami</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="C-201"
                            className="bg-secondary border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="o83"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={(v) => field.onChange(!!v)}
                          id="o83"
                        />
                      </FormControl>
                      <FormLabel htmlFor="o83" className="!mt-0">
                        O83
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </>
            )}

            {operators.length > 0 && (
              <FormField
                control={form.control}
                name="registered_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operator</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue placeholder="Operatorni tanlang (ixtiyoriy)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.name || op.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <FormField
                control={form.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Natijasi</FormLabel>
                    <Select
                      value={field.value || "oqimoqda"}
                      onValueChange={(v) => field.onChange(v as ResultStatus)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(resultLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="has_document"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={(v) => field.onChange(!!v)}
                      id="doc"
                    />
                  </FormControl>
                  <FormLabel htmlFor="doc" className="!mt-0">
                    Hujjat mavjud
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Izoh</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Izoh yozing..."
                      rows={3}
                      className="bg-secondary border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Bekor qilish
              </Button>
              <Button
                type="submit"
                disabled={loading || form.formState.isSubmitting}
              >
                {loading || form.formState.isSubmitting
                  ? "Saqlanmoqda..."
                  : student
                    ? "Saqlash"
                    : "Qo'shish"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentModal;
