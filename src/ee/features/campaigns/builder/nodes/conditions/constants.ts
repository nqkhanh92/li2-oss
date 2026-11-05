const mappingGroupOperatorLabel = {
  and: {
    label: "And",
    description: "All conditions must be true",
    color: "green",
    className: ".select-operator:text-green-500 bg-green-50 border-green-600",
  },
  or: {
    label: "Or",
    description: "At least one condition must be true",
    color: "blue",
    className: ".select-operator:text-blue-500 bg-blue-50 border-blue-600",
  },
  not: {
    label: "Not",
    description: "All conditions must be false",
    color: "red",
    className: ".select-operator:text-red-500 bg-red-50 border-red-600",
  },
  xor: {
    label: "Only One",
    description: "Exactly one condition must be true",
    color: "orange",
    className:
      ".select-operator:text-orange-500 bg-orange-50 border-orange-600",
  },
} as const;

export { mappingGroupOperatorLabel };
