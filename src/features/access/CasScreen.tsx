import { useState } from 'react';

import {
  Badge,
  Button,
  ConfirmDialog,
  Detail,
  DetailList,
  Dialog,
  FormActions,
  PageHeader,
  SelectField,
  TextField,
  Time,
  type BadgeTone,
  type Column,
} from '../../ui';
import { useCan } from '../../auth/AuthContext';
import type {
  CaAlgorithm,
  CaBackend,
  CaKind,
  CaResource,
  CaRotationState,
} from '../../api/types';
import { CrudList, MutationError, OriginBadge } from './common';
import {
  useCas,
  useCreateCa,
  useDeleteCa,
  useRotateCa,
  useUpdateCa,
} from './hooks';

const CA_KIND_OPTIONS: readonly { value: CaKind; label: string }[] = [
  { value: 'user', label: 'user' },
  { value: 'session', label: 'session' },
  { value: 'host', label: 'host' },
];

const CA_BACKEND_OPTIONS: readonly { value: CaBackend; label: string }[] = [
  { value: 'local', label: 'local' },
  { value: 'aws_kms', label: 'aws_kms' },
  { value: 'azure_keyvault', label: 'azure_keyvault' },
  { value: 'vault', label: 'vault' },
];

const CA_ALGORITHM_OPTIONS: readonly { value: CaAlgorithm; label: string }[] = [
  { value: 'ecdsa-p256', label: 'ecdsa-p256' },
  { value: 'ecdsa-p384', label: 'ecdsa-p384' },
  { value: 'ed25519', label: 'ed25519' },
  { value: 'rsa-2048', label: 'rsa-2048' },
  { value: 'rsa-4096', label: 'rsa-4096' },
];

const ROTATION_TONE: Record<CaRotationState, BadgeTone> = {
  incoming: 'info',
  active: 'pass',
  outgoing: 'warn',
  expired: 'fail',
};

type Dialog =
  | { kind: 'create' }
  | { kind: 'detail'; row: CaResource }
  | { kind: 'edit'; row: CaResource }
  | { kind: 'delete'; row: CaResource }
  | { kind: 'rotate'; row: CaResource };

function CaForm({
  existing,
  onDone,
}: {
  existing?: CaResource;
  onDone: () => void;
}) {
  const create = useCreateCa();
  const update = useUpdateCa();
  const [name, setName] = useState(existing?.name ?? '');
  const [caKind, setCaKind] = useState<CaKind>(existing?.caKind ?? 'user');
  const [backend, setBackend] = useState<CaBackend>(
    existing?.backend ?? 'local',
  );
  const [keyReference, setKeyReference] = useState(
    existing?.keyReference ?? '',
  );
  const [algorithm, setAlgorithm] = useState<CaAlgorithm>(
    existing?.algorithm ?? 'ecdsa-p256',
  );

  const pending = create.isPending || update.isPending;

  const submit = () => {
    if (existing) {
      update.mutate(
        {
          id: existing.id,
          body: { backend, keyReference, algorithm, version: existing.version },
        },
        { onSuccess: onDone },
      );
    } else {
      create.mutate(
        { name, caKind, backend, keyReference, algorithm },
        { onSuccess: onDone },
      );
    }
  };

  return (
    <div className="form">
      {existing === undefined ? (
        <>
          <TextField label="Name" value={name} onChange={setName} required />
          <SelectField
            label="CA kind"
            value={caKind}
            onChange={setCaKind}
            options={CA_KIND_OPTIONS}
            required
          />
        </>
      ) : (
        <p className="muted">
          The name and CA kind are immutable; rotate to roll the key.
        </p>
      )}
      <SelectField
        label="Backend"
        value={backend}
        onChange={setBackend}
        options={CA_BACKEND_OPTIONS}
        required
      />
      <TextField
        label="Key reference"
        value={keyReference}
        onChange={setKeyReference}
        required
        hint="A backend key handle/reference only — never private key material."
      />
      <SelectField
        label="Algorithm"
        value={algorithm}
        onChange={setAlgorithm}
        options={CA_ALGORITHM_OPTIONS}
        required
      />
      <MutationError error={existing ? update.error : create.error} />
      <FormActions>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : existing ? 'Save changes' : 'Create CA'}
        </Button>
      </FormActions>
    </div>
  );
}

function CaDetail({ row }: { row: CaResource }) {
  return (
    <DetailList>
      <Detail label="Name">{row.name}</Detail>
      <Detail label="Kind">
        <Badge tone="neutral">{row.caKind}</Badge>
      </Detail>
      <Detail label="Backend">{row.backend}</Detail>
      <Detail label="Key reference">{row.keyReference}</Detail>
      <Detail label="Algorithm">{row.algorithm}</Detail>
      <Detail label="Rotation state">
        <Badge tone={ROTATION_TONE[row.rotationState]}>
          {row.rotationState}
        </Badge>
      </Detail>
      <Detail label="Origin">
        <OriginBadge origin={row.origin} />
      </Detail>
      <Detail label="Version">{row.version}</Detail>
      <Detail label="Created">
        <Time value={row.createdAt} />
      </Detail>
      <Detail label="Updated">
        <Time value={row.updatedAt} />
      </Detail>
    </DetailList>
  );
}

function RotateCaBody({
  row,
  onDone,
}: {
  row: CaResource;
  onDone: () => void;
}) {
  const rotate = useRotateCa();
  // '' means "inherit the active CA" — omitted from the request.
  const [algorithm, setAlgorithm] = useState<CaAlgorithm | ''>('');
  const [keyReference, setKeyReference] = useState('');

  const confirm = () => {
    rotate.mutate(
      {
        id: row.id,
        body: {
          algorithm: algorithm === '' ? undefined : algorithm,
          keyReference: keyReference.trim() === '' ? undefined : keyReference,
        },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <ConfirmDialog
      title={`Rotate CA "${row.name}"?`}
      confirmLabel="Rotate"
      variant="primary"
      pending={rotate.isPending}
      error={rotate.error}
      onConfirm={confirm}
      onClose={onDone}
    >
      <p>
        Provisions a new key in the same backend and promotes it to active; the
        current key becomes outgoing and still verifies existing certificates
        until it expires.
      </p>
      <SelectField
        label="Algorithm override"
        value={algorithm}
        onChange={setAlgorithm}
        options={[
          { value: '', label: 'Keep current algorithm' },
          ...CA_ALGORITHM_OPTIONS,
        ]}
      />
      <TextField
        label="Incoming key reference"
        value={keyReference}
        onChange={setKeyReference}
        hint="Optional backend-provisioned handle; never private material."
      />
    </ConfirmDialog>
  );
}

export function CasScreen() {
  const canManage = useCan('ca:manage');
  const canRotate = useCan('ca:rotate');
  const cas = useCas();
  const del = useDeleteCa();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => {
    setDialog(null);
    del.reset();
  };

  const columns: Column<CaResource>[] = [
    { header: 'Name', cell: (r) => r.name },
    { header: 'Kind', cell: (r) => r.caKind },
    { header: 'Backend', cell: (r) => r.backend },
    { header: 'Algorithm', cell: (r) => r.algorithm },
    {
      header: 'Rotation',
      cell: (r) => (
        <Badge tone={ROTATION_TONE[r.rotationState]}>{r.rotationState}</Badge>
      ),
    },
    { header: 'Origin', cell: (r) => <OriginBadge origin={r.origin} /> },
  ];

  return (
    <section>
      <PageHeader
        title="Certificate authorities"
        description="Per-CA backend and key reference. Private key material is never exposed."
        actions={
          canManage ? (
            <Button
              variant="primary"
              onClick={() => {
                setDialog({ kind: 'create' });
              }}
            >
              New CA…
            </Button>
          ) : undefined
        }
      />
      <CrudList
        list={cas}
        columns={columns}
        rowKey={(r) => r.id}
        caption="Certificate authorities"
        emptyTitle="No certificate authorities yet"
        onRowClick={(row) => {
          setDialog({ kind: 'detail', row });
        }}
      />

      {dialog?.kind === 'create' && (
        <Dialog title="New certificate authority" onClose={close}>
          <CaForm onDone={close} />
        </Dialog>
      )}
      {dialog?.kind === 'edit' && (
        <Dialog title={`Edit CA "${dialog.row.name}"`} onClose={close}>
          <CaForm existing={dialog.row} onDone={close} />
        </Dialog>
      )}
      {dialog?.kind === 'detail' && (
        <Dialog title={dialog.row.name} onClose={close}>
          <CaDetail row={dialog.row} />
          <FormActions>
            {canManage && (
              <Button
                onClick={() => {
                  setDialog({ kind: 'edit', row: dialog.row });
                }}
              >
                Edit
              </Button>
            )}
            {canRotate && (
              <Button
                onClick={() => {
                  setDialog({ kind: 'rotate', row: dialog.row });
                }}
              >
                Rotate
              </Button>
            )}
            {canManage && (
              <Button
                variant="danger"
                onClick={() => {
                  setDialog({ kind: 'delete', row: dialog.row });
                }}
              >
                Delete
              </Button>
            )}
          </FormActions>
        </Dialog>
      )}
      {dialog?.kind === 'rotate' && (
        <RotateCaBody row={dialog.row} onDone={close} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Delete CA "${dialog.row.name}"?`}
          confirmLabel="Delete"
          pending={del.isPending}
          error={del.error}
          onConfirm={() => {
            del.mutate(dialog.row.id, { onSuccess: close });
          }}
          onClose={close}
        >
          <p>
            Deleting the sole active CA of a kind is rejected — a kind must
            always retain a signer.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
