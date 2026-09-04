Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    stepNumber: { type: Number, value: 1 },
    title: { type: String, value: "" },
    description: { type: String, value: "" },
    active: { type: Boolean, value: false },
  },
});
