/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.MeasuredValues;
import org.mousephenotype.dcc.entities.overviews.MetadataGroupToValues;
import org.mousephenotype.dcc.entities.overviews.ProcedureMetadataGroup;
import org.mousephenotype.dcc.entities.qc.StateAndUnresolvedIssuesCount;
import org.mousephenotype.dcc.visualise.entities.AssociatedMedia;
import org.mousephenotype.dcc.visualise.entities.MeasurementContext;
import org.mousephenotype.dcc.visualise.entities.Measurements;

/**
 * Web service for retrieving measurements for a given data context.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("measurements")
public class MeasurementsFacadeREST extends AbstractFacade<MeasuredValues> {

    private final int QC_DONE = 0;
    private final int QC_PENDING = 1;
    private final int QC_ISSUES = 2;
    private final int MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD = 20;
    private final int MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD = 20;
    private final Double DEFAULT_PVALUE_THRESHOLD = 0.0001;

    private final List<String> notes = new ArrayList<>();

    public MeasurementsFacadeREST() {
        super(MeasuredValues.class);
    }

    private List<MeasuredValues> getMutantMeasurements(
            EntityManager em,
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String procedureKey,
            String parameterKey
    ) {
        TypedQuery<MeasuredValues> query
                = em.createNamedQuery(
                        "MeasurementsPerformed.findMutantMeasurementsIgnorePipeline",
                        MeasuredValues.class);
        query.setParameter("centreId", centreId);
        query.setParameter("genotypeId", genotypeId);
        query.setParameter("strainId", strainId);
        query.setParameter("procedureKey", procedureKey);
        query.setParameter("parameterKey", parameterKey);
        List<MeasuredValues> temp = query.getResultList();
        return temp;
    }

    private List<MeasuredValues> getBaselineMeasurements(
            EntityManager em,
            Integer centreId,
            Integer strainId,
            String parameterKey,
            ProcedureMetadataGroup t) {
        TypedQuery<MeasuredValues> query
                = em.createNamedQuery(
                        "MeasurementsPerformed.findBaselineMeasurements",
                        MeasuredValues.class);
        query.setParameter("parameterId", parameterKey);
        query.setParameter("centreId", centreId);
        query.setParameter("strainId", strainId);
        query.setParameter("procedureId", t.getProcedureId());
        query.setParameter("metadataGroup", t.getMetadataGroup());
        query.setParameter("pipeline", t.getPipeline());
        List<MeasuredValues> temp = query.getResultList();
        return temp;
    }

    private MetadataGroupToValues getMetadataGroupValue(
            EntityManager em,
            String mg
    ) {
        MetadataGroupToValues v = null;
        TypedQuery<MetadataGroupToValues> query
                = em.createNamedQuery(
                        "MetadataGroupToValues.findByMetadataGroup",
                        MetadataGroupToValues.class);
        query.setParameter("metadataGroup", mg);
        query.setMaxResults(1);
        try {
            v = query.getSingleResult();
        } catch (Exception e) {
        }
        return v;
    }

    // We do not wish to send the meta-data group checksum or the values
    // for every measurement. So, we group all of the distinct meta-data groups
    // and send them with the measurements. Within each measurement, we replace
    // the meta-data group checksum with the id.
    private List<MetadataGroupToValues> convertMetadataGroupsToIndices(
            EntityManager em,
            List<MeasuredValues> g
    ) {
        List<MetadataGroupToValues> mgs = new ArrayList<>();
        HashMap<String, MetadataGroupToValues> distinct = new HashMap<>();
        Iterator<MeasuredValues> i = g.iterator();
        while (i.hasNext()) {
            MeasuredValues v = i.next();
            String checksum = v.getMetadataGroup();
            MetadataGroupToValues mg = distinct.get(checksum);
            if (mg == null) {
                mg = getMetadataGroupValue(em, checksum);
                if (mg != null) {
                    distinct.put(checksum, mg);
                    mgs.add(mg);
                }
            }
            v.setMetadataGroupIndex(mg == null
                    ? -1L : mg.getMetadataGroupToValuesId());
        }
        return mgs;
    }

    public List<ProcedureMetadataGroup> getProcedureMetadataGroups(
            EntityManager em,
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey
    ) {
        List<ProcedureMetadataGroup> t = null;
        TypedQuery<ProcedureMetadataGroup> q
                = em.createNamedQuery("ProcedureAnimalOverview.findByCidGidSidQeid",
                        ProcedureMetadataGroup.class);
        q.setParameter("centreId", centreId);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        try {
            t = q.getResultList();
        } catch (Exception e) {
        }
        return t;
    }

    public StateAndUnresolvedIssuesCount getQcStatusCountAndLastupdate(
            EntityManager em,
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey
    ) {
        TypedQuery<StateAndUnresolvedIssuesCount> q
                = em.createNamedQuery("DataContext.getStatusAndCountQcIssues",
                        StateAndUnresolvedIssuesCount.class);
        q.setParameter("centreId", centreId);
        q.setParameter("genotypeId", genotypeId);
        q.setParameter("strainId", strainId);
        q.setParameter("parameterId", parameterKey);
        q.setMaxResults(1);
        StateAndUnresolvedIssuesCount r = null;
        try {
            r = q.getSingleResult();
        } catch (Exception e) {
        }
        return r;
    }

    public int getQcStatus(StateAndUnresolvedIssuesCount r) {
        int status = QC_PENDING;
        if (r.getStateId() == 1) {
            status = QC_DONE;
        }
        if (r.getNumUnresolved() != null && r.getNumUnresolved() > 0) {
            status = QC_ISSUES;
        }
        return status;
    }

    public AssociatedMedia getAssociatedMediaParameter(
            EntityManager em,
            Integer centreId,
            Integer genotypeId,
            Integer strainId,
            String parameterKey
    ) {
        AssociatedMedia a = null;
        TypedQuery<AssociatedMedia> q
                = em.createNamedQuery("Association.getKey", AssociatedMedia.class);
        q.setParameter("cid", centreId);
        q.setParameter("gid", genotypeId);
        q.setParameter("sid", strainId);
        q.setParameter("qeid", parameterKey);
        q.setMaxResults(1);
        try {
            a = q.getSingleResult();
        } catch (Exception e) {
        }
        return a;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public MeasurementsPack extjsFindBy(
            @QueryParam("cid") Integer centreId,
            @QueryParam("gid") Integer genotypeId,
            @QueryParam("sid") Integer strainId,
            @QueryParam("qeid") String parameterKey,
            @QueryParam("includeBaseline") Boolean includeBaseline) {
        MeasurementsPack p = new MeasurementsPack();
        if (centreId == null || genotypeId == null || strainId == null
                || parameterKey == null || parameterKey.isEmpty()) {
            p.setDataSet(null, 0L);
        } else {
            EntityManager em = getEntityManager();
            List<ProcedureMetadataGroup> t = getProcedureMetadataGroups(
                    em, centreId, genotypeId, strainId, parameterKey);
            if (t == null || t.isEmpty()) {
                p.setDataSet(null, 0L);
            } else {
                List<MeasuredValues> temp
                        = getMutantMeasurements(em, centreId, genotypeId,
                                strainId, t.get(0).getProcedureId(),
                                parameterKey);
                if (genotypeId != 0
                        && includeBaseline != null
                        && includeBaseline) {
                    Iterator<ProcedureMetadataGroup> i = t.iterator();
                    while (i.hasNext()) {
                        temp.addAll(getBaselineMeasurements(
                                em, centreId, strainId,
                                parameterKey, i.next()));
                    }
                }
                List<MetadataGroupToValues> mgs
                        = convertMetadataGroupsToIndices(em, temp);
                p.setMetadataGroups(mgs);
                StateAndUnresolvedIssuesCount r
                        = getQcStatusCountAndLastupdate(em, centreId,
                                genotypeId, strainId, parameterKey);
                p.setQcStatus(getQcStatus(r));
                p.setLastUpdate(r.getLastUpdate());
                p.setAssociatedMedia(getAssociatedMediaParameter(em, centreId,
                        genotypeId, strainId, parameterKey));
                p.setDataSet(temp);
            }
            em.close();
        }
        return p;
    }

    @GET
    @Path("download")
    @Produces(MediaType.APPLICATION_JSON)
    public MeasurementsSetPack download(
            @QueryParam("mgiid") String mgiId,
            @QueryParam("parameter") String parameter,
            @QueryParam("includeBaseline") Boolean includeBaseline
    ) {
        MeasurementsSetPack p = new MeasurementsSetPack();
        if (mgiId == null || parameter == null) {
            p.setDataSet(null, 0L);
            return p;
        }
        EntityManager em = getEntityManager();
        List<MeasurementContext> mcs
                = translateMgiidStringToMeasurementContexts(em, mgiId);

        List<String> splitParameters = Arrays.asList(parameter.split("\\s*,\\s*"));
        if (mcs == null || splitParameters.isEmpty()) {
            p.setDataSet(null, 0L);
            em.close();
            return p;
        }
        List<String> parameters = new ArrayList<>(new HashSet<>(splitParameters));

        int ng = 0, np;
        List<Measurements> measurements = new ArrayList<>();
        for (MeasurementContext mc : mcs) {
            np = 0;
            for (String q : parameters) {
                measurements.add(retrieveMeasurements(em, mc, q, includeBaseline));
                if (++np == MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD) {
                    break;
                }
            }
            if (++ng == MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD) {
                break;
            }
        }
        p.setDataSet(measurements);
        if (mcs.size() > MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD) {
            notes.add("Data for only " + MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD
                    + " genes can be downloaded at a time. Choosing first "
                    + MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD + " genes.");
        }
        if (parameters.size() > MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD) {
            notes.add("Data for only " + MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD
                    + " parameters can be downloaded at a time. Choosing first "
                    + MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD + " parameters.");
        }
        p.setNotes(notes);
        em.close();
        return p;
    }

    @GET
    @Path("download/significant/genes")
    @Produces(MediaType.APPLICATION_JSON)
    public MeasurementsSetPack downloadSignificantGenes(
            @QueryParam("parameter") String parameter,
            @QueryParam("pvalueThreshold") Double pvalueThreshold,
            @QueryParam("includeBaseline") Boolean includeBaseline
    ) {
        MeasurementsSetPack p = new MeasurementsSetPack();
        if (parameter == null) {
            p.setDataSet(null, 0L);
            return p;
        }
        EntityManager em = getEntityManager();
        List<String> splitParameters = Arrays.asList(parameter.split("\\s*,\\s*"));
        if (splitParameters.isEmpty()) {
            p.setDataSet(null, 0L);
            em.close();
            return p;
        }

        if (pvalueThreshold == null || pvalueThreshold < 0.0 || pvalueThreshold > 1.0) {
            notes.add("Supplied p-value threshold " + pvalueThreshold
                    + " is invalid. Choosing default value "
                    + DEFAULT_PVALUE_THRESHOLD + ".");
            pvalueThreshold = DEFAULT_PVALUE_THRESHOLD;
        }

        List<String> parameters = new ArrayList<>(new HashSet<>(splitParameters));
        List<Measurements> measurements = new ArrayList<>();
        int np = 0;
        for (String q : parameters) {
            List<MeasurementContext> mcs
                    = getSignificantMeasurementContextsForParameter(em, q, pvalueThreshold);
            if (mcs == null) {
                continue;
            }
            for (MeasurementContext mc : mcs) {
                Measurements m = retrieveMeasurements(em, mc, q, includeBaseline);
                if (m != null) {
                    measurements.add(m);
                }
            }
            if (++np == MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD) {
                break;
            }
        }
        p.setDataSet(measurements);
        if (parameters.size() > MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD) {
            notes.add("Data for only " + MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD
                    + " parameters can be downloaded at a time. Choosing first "
                    + MAX_NUM_PARAMETERS_ALLOWED_FOR_DOWNLOAD + " parameters.");
        }
        p.setNotes(notes);
        em.close();
        return p;
    }

    @GET
    @Path("download/significant/parameters")
    @Produces(MediaType.APPLICATION_JSON)
    public MeasurementsSetPack downloadSignificantParameters(
            @QueryParam("mgiid") String mgiId,
            @QueryParam("pvalueThreshold") Double pvalueThreshold,
            @QueryParam("includeBaseline") Boolean includeBaseline
    ) {
        MeasurementsSetPack p = new MeasurementsSetPack();
        if (mgiId == null) {
            p.setDataSet(null, 0L);
            return p;
        }
        EntityManager em = getEntityManager();
        List<MeasurementContext> mcs
                = translateMgiidStringToMeasurementContexts(em, mgiId);

        if (mcs == null) {
            p.setDataSet(null, 0L);
            em.close();
            return p;
        }

        if (pvalueThreshold == null || pvalueThreshold < 0.0 || pvalueThreshold > 1.0) {
            notes.add("Supplied p-value threshold " + pvalueThreshold
                    + " is invalid. Choosing default value "
                    + DEFAULT_PVALUE_THRESHOLD + ".");
            pvalueThreshold = DEFAULT_PVALUE_THRESHOLD;
        }

        int ng = 0;
        List<Measurements> measurements = new ArrayList<>();
        for (MeasurementContext mc : mcs) {
            List<String> params
                    = getSignificantParametersForMeasurementContext(em, mc, pvalueThreshold);
            if (params == null) {
                continue;
            }
            for (String q : params) {
                Measurements m = retrieveMeasurements(em, mc, q, includeBaseline);
                if (m != null) {
                    measurements.add(m);
                }
            }
            if (++ng == MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD) {
                break;
            }
        }
        p.setDataSet(measurements);
        if (mcs.size() > MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD) {
            notes.add("Data for only " + MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD
                    + " genes can be downloaded at a time. Choosing first "
                    + MAX_NUM_GENES_ALLOWED_FOR_DOWNLOAD + " genes.");
        }
        p.setNotes(notes);
        em.close();
        return p;
    }

    private List<MeasurementContext> translateMgiidStringToMeasurementContexts(
            EntityManager em,
            String mgiidStr
    ) {
        if (mgiidStr == null || mgiidStr.isEmpty()) {
            return null;
        }
        List<String> splitMgiIds = Arrays.asList(mgiidStr.split("\\s*,\\s*"));
        if (splitMgiIds.isEmpty()) {
            return null;
        }
        return translateMgiIdsToMeasurementContexts(em, splitMgiIds);
    }

    private List<MeasurementContext> translateMgiIdsToMeasurementContexts(
            EntityManager em,
            List<String> mgiidList
    ) {
        if (mgiidList == null || mgiidList.isEmpty()) {
            return null;
        }

        List<String> mgiIds = new ArrayList<>(new HashSet<>(mgiidList));

        /*
         use phenodcc_overviews;
         select g.centre_id, g.genotype_id, g.strain_id, c.full_name, g.gene_symbol, g.allele_name, s.strain
         from
         genotype as g
         left join strain as s on (g.strain_id = s.strain_id)
         left join centre as c on (g.centre_id = c.centre_id)
         where
         g.gene_id in ('MGI:1341898', 'MGI:2675492')
         ;
         */
        List<MeasurementContext> mcs = new ArrayList<>();
        try {
            TypedQuery<MeasurementContext> q
                    = em.createQuery("select new org.mousephenotype.dcc.visualise.entities.MeasurementContext(g.geneId, g.centreId, g.genotypeId, g.strainId, c.fullName, g.geneSymbol, g.alleleName, s.strain) from Genotype g left join Strain s on (g.strainId = s.strainId) left join ACentre c on (g.centreId = c.centreId) where g.geneId in :mgiids",
                            MeasurementContext.class);
            q.setParameter("mgiids", mgiIds);
            mcs = q.getResultList();
        } catch (Exception e) {
            System.err.println(e);
        }
        return mcs;
    }

    private Measurements retrieveMeasurements(
            EntityManager em,
            MeasurementContext mc,
            String parameterKey,
            Boolean includeBaseline) {
        Measurements m = new Measurements();
        Integer centreId = mc.getCentreId();
        Integer genotypeId = mc.getGenotypeId();
        Integer strainId = mc.getStrainId();

        List<ProcedureMetadataGroup> t = getProcedureMetadataGroups(
                em, centreId, genotypeId, strainId, parameterKey);
        if (t == null || t.isEmpty()) {
            return null;
        }
        List<MeasuredValues> temp
                = getMutantMeasurements(em, centreId, genotypeId, strainId,
                        t.get(0).getProcedureId(), parameterKey);
        if (mc.getGenotypeId() != 0 && includeBaseline != null && includeBaseline) {
            Iterator<ProcedureMetadataGroup> i = t.iterator();
            while (i.hasNext()) {
                temp.addAll(getBaselineMeasurements(em, centreId,
                        strainId, parameterKey, i.next()));
            }
        }
        List<MetadataGroupToValues> mgs = convertMetadataGroupsToIndices(em, temp);
        m.setMetadataGroups(mgs);
        StateAndUnresolvedIssuesCount r
                = getQcStatusCountAndLastupdate(em, centreId,
                        genotypeId, strainId, parameterKey);
        m.setQcStatus(getQcStatus(r));
        m.setLastUpdate(r.getLastUpdate());
        m.setMeasurements(temp);
        m.setMgiId(mc.getMgiId());
        m.setAllele(mc.getAllele());
        m.setCentreName(mc.getCentreName());
        m.setGenotype(mc.getGenotype());
        m.setStrain(mc.getStrain());
        m.setParameterKey(parameterKey);
        return m;
    }

    private List<MeasurementContext> getSignificantMeasurementContextsForParameter(
            EntityManager em,
            String parameterKey,
            Double pvalueThreshold) {
        try {
            TypedQuery<MeasurementContext> q
                    = em.createQuery("select new org.mousephenotype.dcc.visualise.entities.MeasurementContext(g.geneId, g.centreId, g.genotypeId, g.strainId, c.fullName, g.geneSymbol, g.alleleName, s.strain) from Annotation a left join Genotype g on (g.genotypeId = a.genotypeId) left join Strain s on (g.strainId = s.strainId) left join ACentre c on (g.centreId = c.centreId) where a.pvalueDouble < :pvalueThreshold and a.parameterId = :parameterKey",
                            MeasurementContext.class);
            q.setParameter("parameterKey", parameterKey);
            q.setParameter("pvalueThreshold", pvalueThreshold);
            return q.getResultList();
        } catch (Exception e) {
            System.err.println(e);
            return null;
        }
    }

    private List<String> getSignificantParametersForMeasurementContext(
            EntityManager em,
            MeasurementContext mc,
            Double pvalueThreshold) {
        try {
            TypedQuery<String> q
                    = em.createQuery("select a.parameterId from Annotation a inner join Genotype g on (g.genotypeId = a.genotypeId) where a.pvalueDouble < :pvalueThreshold and g.geneId = :mgiid",
                            String.class);
            q.setParameter("mgiid", mc.getMgiId());
            q.setParameter("pvalueThreshold", pvalueThreshold);
            return q.getResultList();
        } catch (Exception e) {
            System.err.println(e);
            return null;
        }
    }
}
